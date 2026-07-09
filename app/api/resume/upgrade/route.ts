import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // required — pdf-parse/mammoth/pdfkit need Node, not Edge
export const maxDuration = 60; // give the function more time (needs Pro plan for >10s on Hobby)

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e: any) {
      console.error("PDF parse error:", e);
      throw new Error(
        `Could not read this PDF (${e?.message ?? "corrupt or unsupported PDF structure"}). Try re-exporting the PDF (e.g. from Word/Google Docs → "Save as PDF" or "Print to PDF") and upload again, or upload a .docx instead.`
      );
    }
  }

  if (name.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (e: any) {
      console.error("DOCX parse error:", e);
      throw new Error(
        `Could not read this DOCX file (${e?.message ?? "corrupt or unsupported structure"}). Try re-saving it and uploading again.`
      );
    }
  }

  throw new Error("Unsupported file type. Please upload a .pdf or .docx file.");
}

function buildPdf(resume: {
  name: string;
  contact: string;
  summary: string;
  experience: { title: string; company: string; dates: string; bullets: string[] }[];
  education: { degree: string; school: string; dates: string }[];
  skills: string[];
}): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const path = await import("path");
      const PDFDocument = (await import("pdfkit")).default;

      const fontDir = path.join(process.cwd(), "assets", "fonts");
      const regularFontPath = path.join(fontDir, "Inter-Regular.ttf");
      const boldFontPath = path.join(fontDir, "Inter-Bold.ttf");

      // Set the custom font as default AT CONSTRUCTION TIME.
      // pdfkit otherwise defaults to "Helvetica" internally and tries to load
      // its .afm metrics file immediately, before registerFont() ever runs.
      const doc = new PDFDocument({
        margin: 54,
        size: "LETTER",
        font: regularFontPath,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Body", regularFontPath);
      doc.registerFont("Body-Bold", boldFontPath);

      doc.font("Body-Bold").fontSize(18).text(resume.name);
      doc.font("Body").fontSize(10).text(resume.contact);
      doc.moveDown();

      doc.font("Body-Bold").fontSize(12).text("SUMMARY");
      doc.font("Body").fontSize(10).text(resume.summary);
      doc.moveDown();

      doc.font("Body-Bold").fontSize(12).text("EXPERIENCE");
      doc.moveDown(0.3);
      for (const job of resume.experience ?? []) {
        doc.font("Body-Bold").fontSize(10).text(`${job.title}, ${job.company}`);
        doc.font("Body").fontSize(9).fillColor("gray").text(job.dates);
        doc.fillColor("black");
        for (const bullet of job.bullets ?? []) {
          doc.font("Body").fontSize(10).text(`• ${bullet}`, { indent: 10 });
        }
        doc.moveDown(0.5);
      }

      doc.font("Body-Bold").fontSize(12).text("EDUCATION");
      doc.moveDown(0.3);
      for (const ed of resume.education ?? []) {
        doc.font("Body-Bold").fontSize(10).text(ed.degree);
        doc.font("Body").fontSize(9).fillColor("gray").text(`${ed.school} — ${ed.dates}`);
        doc.fillColor("black");
        doc.moveDown(0.3);
      }

      doc.font("Body-Bold").fontSize(12).text("SKILLS");
      doc.font("Body").fontSize(10).text((resume.skills ?? []).join(", "));

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobDescription = (formData.get("jobDescription") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let resumeText: string;
    try {
      resumeText = await extractText(file);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Failed to extract text from file" },
        { status: 422 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract enough text from the file" }, { status: 422 });
    }

    const systemPrompt = `You are an expert resume writer. Rewrite and upgrade the given resume into a polished, ATS-optimized version.
Return ONLY valid JSON, no markdown fences, matching this exact shape:
{
  "name": string,
  "contact": string,
  "summary": string,
  "experience": [{ "title": string, "company": string, "dates": string, "bullets": string[] }],
  "education": [{ "degree": string, "school": string, "dates": string }],
  "skills": string[]
}
Improve weak bullet points into strong, quantified, action-driven statements. Keep facts accurate — do not invent employers, dates, or credentials that aren't implied by the original text. If a job description is provided, tailor the summary, bullet emphasis, and skills ordering toward it.`;

    const userPrompt = jobDescription
      ? `ORIGINAL RESUME:\n${resumeText}\n\nTARGET JOB DESCRIPTION:\n${jobDescription}\n\nRewrite this resume, tailored to the job above.`
      : `ORIGINAL RESUME:\n${resumeText}\n\nRewrite and upgrade this resume.`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (e: any) {
      console.error("AI completion error:", e);
      return NextResponse.json(
        { error: `AI request failed: ${e?.message ?? "unknown error"}` },
        { status: 502 }
      );
    }

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let resume;
    try {
      resume = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON", raw: cleaned }, { status: 502 });
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await buildPdf(resume);
    } catch (e: any) {
      console.error("PDF build error:", e);
      return NextResponse.json(
        { error: `Failed to generate PDF: ${e?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }

    // Save to history (non-fatal if this fails)
    try {
      const { data: resumeRow } = await supabaseAdmin
        .from("resumes")
        .insert({ user_id: userId, raw_text: resumeText })
        .select()
        .single();

      await supabaseAdmin.from("optimizations").insert({
        user_id: userId,
        resume_id: resumeRow?.id,
        ats_score: null,
        suggestions: resume,
      });
    } catch (e) {
      console.error("Supabase save error (non-fatal):", e);
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="upgraded-resume.pdf"',
      },
    });
  } catch (err: any) {
    console.error("resume/upgrade error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@/lib/openai";
import { withRetry } from "@/lib/withRetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText, jobDescription, tone } = await req.json();
    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
    }
    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json({ error: "jobDescription is required" }, { status: 400 });
    }

    const toneInstruction =
      tone === "enthusiastic"
        ? "Write in an enthusiastic, energetic tone."
        : tone === "formal"
        ? "Write in a formal, traditional tone."
        : "Write in a confident, professional, conversational tone.";

    const systemPrompt = `You are an expert cover letter writer. Write a tailored, compelling cover letter based on the candidate's resume and the target job description.
${toneInstruction}
Keep it to 3-4 short paragraphs. Reference specific, real experience from the resume — do not invent employers, dates, or achievements. Do not use generic filler phrases like "I am writing to express my interest."
Return ONLY valid JSON, no markdown fences, matching this shape:
{
  "greeting": string,
  "body": string[] (array of paragraphs, 3-4 items),
  "closing": string
}`;

    const userPrompt = `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nWrite a tailored cover letter for this application.`;

    let completion;
    try {
      completion = await withRetry(() =>
        openai.chat.completions.create({
          model: "gemini-3.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        })
      );
    } catch (e: any) {
      console.error("AI completion error:", e);
      const status = e?.status === 429 ? 429 : e?.status === 503 ? 503 : 502;
      const message =
        status === 429
          ? "We're getting a lot of requests right now. Please wait about 30 seconds and try again."
          : status === 503
          ? "The AI service is temporarily busy. Please try again in a moment."
          : `AI request failed: ${e?.message ?? "unknown error"}`;
      return NextResponse.json({ error: message }, { status });
    }

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("cover-letter/generate error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";
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

    const { resumeText, jobDescription } = await req.json();
    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert technical resume reviewer and ATS specialist.
Return ONLY valid JSON, no markdown fences, matching this shape:
{
  "ats_score": number (0-100),
  "summary": string (2-3 sentences, direct and specific),
  "missing_keywords": string[],
  "bullet_rewrites": [{ "original": string, "improved": string, "why": string }],
  "structural_issues": string[]
}
Be concrete. Reference the actual text of the resume. Do not give generic advice.`;

    const userPrompt = jobDescription
      ? `RESUME:\n${resumeText}\n\nTARGET JOB DESCRIPTION:\n${jobDescription}\n\nScore and improve this resume specifically against this job.`
      : `RESUME:\n${resumeText}\n\nNo specific job provided — give general ATS and clarity feedback.`;

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

    try {
      const { data: resumeRow } = await supabaseAdmin
        .from("resumes")
        .insert({ user_id: userId, raw_text: resumeText })
        .select()
        .single();

      await supabaseAdmin.from("optimizations").insert({
        user_id: userId,
        resume_id: resumeRow?.id,
        ats_score: result.ats_score,
        suggestions: result,
      });
    } catch (e) {
      console.error("Supabase save error (non-fatal):", e);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("resume/optimize error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

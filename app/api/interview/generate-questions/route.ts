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

    const { resumeText, jobDescription } = await req.json();
    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert interview coach. Generate 5 realistic interview questions for this candidate, based on their resume and (if provided) the target job description.
Mix question types: 2 behavioral (STAR-method style), 2 role-specific/technical or situational, 1 "tell me about a time" tied to something specific in their actual resume.
Return ONLY valid JSON, no markdown fences, matching this shape:
{
  "questions": [
    { "id": string, "type": "behavioral" | "technical" | "situational", "question": string }
  ]
}`;

    const userPrompt = jobDescription
      ? `RESUME:\n${resumeText}\n\nTARGET JOB DESCRIPTION:\n${jobDescription}\n\nGenerate tailored interview questions for this specific role.`
      : `RESUME:\n${resumeText}\n\nNo specific job provided — generate general but resume-relevant interview questions.`;

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: "gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      })
    );

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
    console.error("interview/generate-questions error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

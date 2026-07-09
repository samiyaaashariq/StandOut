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

    const { question, answer } = await req.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert interview coach giving direct, specific feedback.
Return ONLY valid JSON, no markdown fences, matching this shape:
{
  "score": number (0-100),
  "strengths": string[],
  "improvements": string[],
  "example_answer": string
}
Be specific and reference the actual words the candidate used. Do not give generic advice.`;

    const userPrompt = `QUESTION: ${question}\n\nCANDIDATE'S SPOKEN ANSWER (transcribed, may have minor transcription errors): ${answer}\n\nScore this answer and give feedback.`;

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
    console.error("interview/feedback error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedText, chunkText } from "@/lib/openai";
import { scrapeUrl } from "@/lib/firecrawl";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText, jobUrl, jobDescription, jobTitle, company } = await req.json();

    if (!resumeText) {
      return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
    }
    if (!jobUrl && !jobDescription) {
      return NextResponse.json({ error: "Provide either jobUrl or jobDescription" }, { status: 400 });
    }

    const jobText = jobUrl ? await scrapeUrl(jobUrl) : jobDescription;
    if (!jobText || jobText.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract enough job content" }, { status: 422 });
    }

    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .insert({
        user_id: userId,
        title: jobTitle ?? null,
        company: company ?? null,
        source_url: jobUrl ?? null,
        description: jobText,
      })
      .select()
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: jobErr?.message ?? "Failed to save job" }, { status: 500 });
    }

    const jobChunks = chunkText(jobText);
    const jobEmbeddings = await Promise.all(jobChunks.map(embedText));

    await supabaseAdmin.from("job_embeddings").insert(
      jobChunks.map((chunk_text, i) => ({
        job_id: job.id,
        chunk_text,
        embedding: jobEmbeddings[i],
      }))
    );

    const resumeEmbedding = await embedText(resumeText);

    const { data: matches, error: matchErr } = await supabaseAdmin.rpc("match_job_chunks_scoped", {
      query_embedding: resumeEmbedding,
      target_job_id: job.id,
      match_count: 6,
    });

    if (matchErr) {
      return NextResponse.json({ error: matchErr.message }, { status: 500 });
    }

    const topChunks: { chunk_text: string; similarity: number }[] = matches ?? [];
    const avgSimilarity = topChunks.reduce((sum, m) => sum + m.similarity, 0) / (topChunks.length || 1);
    const fitScore = Math.round(avgSimilarity * 100);

    const groundedContext = topChunks.map((c) => `- ${c.chunk_text}`).join("\n");

    const systemPrompt = `You are a career advisor. Return ONLY valid JSON, no markdown fences:
{
  "fit_summary": string (2-3 sentences, direct),
  "strong_matches": string[] (things the resume already demonstrates that the job wants),
  "gaps": string[] (things the job wants that the resume doesn't show),
  "recommendation": "apply" | "apply_with_tailoring" | "skip"
}`;

    const userPrompt = `MOST RELEVANT JOB REQUIREMENTS (retrieved via similarity search):\n${groundedContext}\n\nRESUME:\n${resumeText}\n\nComputed fit score: ${fitScore}/100.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    const raw = result.response.text() ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON", raw: cleaned }, { status: 502 });
    }

    return NextResponse.json({
      job_id: job.id,
      fit_score: fitScore,
      ...analysis,
    });

  } catch (err: any) {
    console.error("jobs/match error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown server error" }, { status: 500 });
  }
}

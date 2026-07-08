"use client";

import { useState } from "react";

type MatchResult = {
  job_id: string;
  fit_score: number;
  fit_summary: string;
  strong_matches: string[];
  gaps: string[];
  recommendation: "apply" | "apply_with_tailoring" | "skip";
};

const RECOMMENDATION_LABEL: Record<MatchResult["recommendation"], string> = {
  apply: "Strong fit — apply",
  apply_with_tailoring: "Tailor first, then apply",
  skip: "Weak fit",
};

export default function JobMatcher({ resumeText }: { resumeText: string }) {
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!resumeText.trim()) {
      setError("Analyze a resume above first — job matching needs your resume text.");
      return;
    }
    if (!jobUrl.trim() && !jobDescription.trim()) {
      setError("Paste a job URL or the job description.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/jobs/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobUrl: jobUrl || undefined,
          jobDescription: jobDescription || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 flex flex-col gap-4 border-t border-neutral-800 pt-8">
      <h2 className="font-display text-xl">Job matching</h2>

      <div>
        <label className="mb-1 block font-body text-sm text-neutral-400">Job posting URL</label>
        <input
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="https://company.com/careers/role"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-body text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <p className="font-body text-xs text-neutral-500">— or paste the description directly —</p>

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={6}
        placeholder="Paste the job description..."
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-body text-sm focus:border-accent focus:outline-none"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim disabled:opacity-50"
      >
        {loading ? "Matching..." : "Match against resume"}
      </button>

      {error && <p className="font-body text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-4 flex flex-col gap-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl text-accent">{result.fit_score}</span>
            <span className="font-body text-sm text-neutral-400">/ 100 fit score</span>
            <span className="ml-auto rounded-full bg-neutral-800 px-3 py-1 font-body text-xs text-neutral-300">
              {RECOMMENDATION_LABEL[result.recommendation]}
            </span>
          </div>
          <p className="font-body text-sm text-neutral-300">{result.fit_summary}</p>

          {result.strong_matches?.length > 0 && (
            <div>
              <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">Strong matches</h3>
              <ul className="list-inside list-disc font-body text-sm text-neutral-300">
                {result.strong_matches.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.gaps?.length > 0 && (
            <div>
              <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">Gaps</h3>
              <ul className="list-inside list-disc font-body text-sm text-neutral-300">
                {result.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

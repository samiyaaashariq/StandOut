"use client";

import { useState, useEffect } from "react";

type Result = {
  ats_score: number;
  summary: string;
  missing_keywords: string[];
  bullet_rewrites: { original: string; improved: string; why: string }[];
  structural_issues: string[];
};

const LOADING_STEPS = [
  "Reading your resume...",
  "Scoring against ATS criteria...",
  "Comparing against job requirements...",
  "Rewriting weak bullet points...",
  "Finalizing suggestions...",
];

export default function ResumeOptimizer({
  onResumeTextChange,
  onUpgradeRequested,
}: {
  onResumeTextChange?: (text: string) => void;
  onUpgradeRequested?: (resumeText: string, jobDescription: string) => void;
}) {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1 < LOADING_STEPS.length ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleSubmit() {
    if (!resumeText.trim()) {
      setError("Paste your resume text first.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDescription || undefined }),
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
    <section className="flex flex-col gap-4">
      <div className="glass-card p-6">
        <label className="mb-1 block font-body text-sm text-neutral-400">
          Resume text
        </label>
        <textarea
          value={resumeText}
          onChange={(e) => {
            setResumeText(e.target.value);
            onResumeTextChange?.(e.target.value);
          }}
          rows={10}
          placeholder="Paste your resume text here..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="glass-card p-6">
        <label className="mb-1 block font-body text-sm text-neutral-400">
          Target job description (optional, makes feedback specific)
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          placeholder="Paste a job description to tailor the review..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze resume"}
      </button>

      {loading && (
        <div className="glass-card animate-card-enter flex flex-col items-center justify-center gap-4 p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-accent" />
          <p className="font-body text-sm text-neutral-400">{LOADING_STEPS[loadingStep]}</p>
        </div>
      )}

      {error && <p className="font-body text-sm text-red-400">{error}</p>}

      {result && (
        <div className="glass-card mt-4 flex flex-col gap-6 p-6">
          <div className="flex items-baseline gap-3">
            <span className="glow-text font-display text-4xl text-accent">{result.ats_score}</span>
            <span className="font-body text-sm text-neutral-400">/ 100 ATS score</span>
          </div>
          <p className="font-body text-sm text-neutral-300">{result.summary}</p>

          {result.missing_keywords?.length > 0 && (
            <div>
              <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">
                Missing keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((k) => (
                  <span key={k} className="rounded-full bg-neutral-800/80 px-3 py-1 font-body text-xs text-neutral-300">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.bullet_rewrites?.length > 0 && (
            <div>
              <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">
                Bullet rewrites
              </h3>
              <div className="flex flex-col gap-4">
                {result.bullet_rewrites.map((b, i) => (
                  <div key={i} className="rounded-lg bg-neutral-950/60 p-4">
                    <p className="mb-1 font-body text-xs text-neutral-500 line-through">{b.original}</p>
                    <p className="mb-1 font-body text-sm text-accent">{b.improved}</p>
                    <p className="font-body text-xs text-neutral-500">{b.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.structural_issues?.length > 0 && (
            <div>
              <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">
                Structural issues
              </h3>
              <ul className="list-inside list-disc font-body text-sm text-neutral-300">
                {result.structural_issues.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => onUpgradeRequested?.(resumeText, jobDescription)}
            className="self-start rounded-full border border-accent px-6 py-2.5 font-body text-sm font-medium text-accent transition hover:bg-accent hover:text-neutral-950"
          >
            Upgrade this resume based on the analysis →
          </button>
        </div>
      )}
    </section>
  );
}

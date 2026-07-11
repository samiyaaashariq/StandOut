"use client";
import { useState } from "react";

type CoverLetter = {
  greeting: string;
  body: string[];
  closing: string;
};

type Tone = "professional" | "enthusiastic" | "formal";

function formatLetterAsText(letter: CoverLetter): string {
  return [letter.greeting, "", ...letter.body, "", letter.closing].join("\n\n");
}

export default function CoverLetterGenerator({
  initialResumeText = "",
  initialJobDescription = "",
}: {
  initialResumeText?: string;
  initialJobDescription?: string;
}) {
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [tone, setTone] = useState<Tone>("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit() {
    if (!resumeText.trim()) {
      setError("Paste your resume text first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Paste the job description you're applying to.");
      return;
    }
    setError(null);
    setLoading(true);
    setLetter(null);
    setCopied(false);
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, tone }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
      setLetter(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!letter) return;
    await navigator.clipboard.writeText(formatLetterAsText(letter));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tones: { id: Tone; label: string }[] = [
    { id: "professional", label: "Professional" },
    { id: "enthusiastic", label: "Enthusiastic" },
    { id: "formal", label: "Formal" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="glass-card p-6">
        <label className="mb-1 block font-body text-sm text-neutral-400">Resume text</label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={8}
          placeholder="Paste your resume text here..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="glass-card p-6">
        <label className="mb-1 block font-body text-sm text-neutral-400">
          Job description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          placeholder="Paste the job description you're applying to..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="glass-card flex gap-1 p-1.5">
        {tones.map((t) => (
          <button
            key={t.id}
            onClick={() => setTone(t.id)}
            className={`flex-1 rounded-xl px-4 py-2 font-body text-sm font-medium transition ${
              tone === t.id
                ? "bg-accent text-neutral-950"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim disabled:opacity-50"
      >
        {loading ? "Writing..." : "Generate cover letter"}
      </button>

      {error && <p className="font-body text-sm text-red-400">{error}</p>}

      {letter && (
        <div className="glass-card animate-card-enter mt-4 flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-neutral-100">Your cover letter</h3>
            <button
              onClick={handleCopy}
              className="rounded-full border border-accent px-4 py-1.5 font-body text-xs font-medium text-accent transition hover:bg-accent hover:text-neutral-950"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>

          <div className="rounded-lg bg-neutral-950/60 p-5">
            <p className="font-body text-sm text-neutral-300">{letter.greeting}</p>
            {letter.body?.map((para, i) => (
              <p key={i} className="mt-3 font-body text-sm leading-relaxed text-neutral-300">
                {para}
              </p>
            ))}
            <p className="mt-3 font-body text-sm text-neutral-300">{letter.closing}</p>
          </div>
        </div>
      )}
    </section>
  );
}

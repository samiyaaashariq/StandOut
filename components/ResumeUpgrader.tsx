"use client";
import { useState } from "react";

type UpgradedResume = {
  name: string;
  contact: string;
  summary: string;
  experience: { title: string; company: string; dates: string; bullets: string[] }[];
  education: { degree: string; school: string; dates: string }[];
  skills: string[];
};

function formatResumeAsText(r: UpgradedResume): string {
  const lines: string[] = [];
  lines.push(r.name);
  lines.push(r.contact);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(r.summary);
  lines.push("");
  lines.push("EXPERIENCE");
  for (const job of r.experience ?? []) {
    lines.push(`${job.title}, ${job.company} — ${job.dates}`);
    for (const bullet of job.bullets ?? []) {
      lines.push(`• ${bullet}`);
    }
    lines.push("");
  }
  lines.push("EDUCATION");
  for (const ed of r.education ?? []) {
    lines.push(`${ed.degree}`);
    lines.push(`${ed.school} — ${ed.dates}`);
  }
  lines.push("");
  lines.push("SKILLS");
  lines.push((r.skills ?? []).join(", "));
  return lines.join("\n");
}

export default function ResumeUpgrader({
  initialResumeText = "",
  initialJobDescription = "",
}: {
  initialResumeText?: string;
  initialJobDescription?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAnalyzedText, setUseAnalyzedText] = useState(!!initialResumeText);
  const [upgradedResume, setUpgradedResume] = useState<UpgradedResume | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit() {
    if (!useAnalyzedText && !file) {
      setError("Choose a .pdf or .docx resume file first.");
      return;
    }
    setError(null);
    setLoading(true);
    setUpgradedResume(null);
    setCopied(false);
    try {
      let res: Response;

      if (useAnalyzedText) {
        res = await fetch("/api/resume/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: initialResumeText,
            jobDescription: jobDescription || undefined,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", file as File);
        if (jobDescription.trim()) formData.append("jobDescription", jobDescription);
        res = await fetch("/api/resume/upgrade", {
          method: "POST",
          body: formData,
        });
      }

      if (!res.ok) {
        let message = `Request failed (status ${res.status})`;
        try {
          const err = await res.json();
          message = err.error ?? message;
        } catch {
          try {
            const text = await res.text();
            if (text) message = text.slice(0, 300);
          } catch {}
        }
        throw new Error(message);
      }

      const data = await res.json();
      setUpgradedResume(data.resume);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!upgradedResume) return;
    const text = formatResumeAsText(upgradedResume);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="glass-card mt-10 flex flex-col gap-4 p-8">
      <h2 className="font-display text-xl">Upload & upgrade resume</h2>

      {initialResumeText && (
        <div className="flex items-center gap-3 rounded-lg bg-accent/10 p-3">
          <input
            type="checkbox"
            checked={useAnalyzedText}
            onChange={(e) => setUseAnalyzedText(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          <label className="font-body text-sm text-neutral-300">
            Use the resume you just analyzed (skip re-upload)
          </label>
        </div>
      )}

      {!useAnalyzedText && (
        <div>
          <label className="mb-1 block font-body text-sm text-neutral-400">
            Resume file (.pdf or .docx)
          </label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm text-neutral-300 file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-neutral-950"
          />
        </div>
      )}

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={5}
        placeholder="(Optional) Paste a target job description to tailor the rewrite..."
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim disabled:opacity-50"
      >
        {loading ? "Upgrading..." : "Upgrade resume"}
      </button>

      {error && <p className="font-body text-sm text-red-400">{error}</p>}

      {upgradedResume && (
        <div className="glass-card animate-card-enter mt-4 flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-neutral-100">Your upgraded resume</h3>
            <button
              onClick={handleCopy}
              className="rounded-full border border-accent px-4 py-1.5 font-body text-xs font-medium text-accent transition hover:bg-accent hover:text-neutral-950"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>

          <div className="rounded-lg bg-neutral-950/60 p-5">
            <p className="font-display text-lg text-neutral-100">{upgradedResume.name}</p>
            <p className="font-body text-sm text-neutral-400">{upgradedResume.contact}</p>

            <h4 className="mb-1 mt-4 font-body text-xs font-semibold uppercase tracking-wide text-accent">
              Summary
            </h4>
            <p className="font-body text-sm text-neutral-300">{upgradedResume.summary}</p>

            <h4 className="mb-1 mt-4 font-body text-xs font-semibold uppercase tracking-wide text-accent">
              Experience
            </h4>
            {upgradedResume.experience?.map((job, i) => (
              <div key={i} className="mb-3">
                <p className="font-body text-sm font-medium text-neutral-200">
                  {job.title}, {job.company}
                </p>
                <p className="font-body text-xs text-neutral-500">{job.dates}</p>
                <ul className="mt-1 list-inside list-disc font-body text-sm text-neutral-300">
                  {job.bullets?.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}

            <h4 className="mb-1 mt-4 font-body text-xs font-semibold uppercase tracking-wide text-accent">
              Education
            </h4>
            {upgradedResume.education?.map((ed, i) => (
              <div key={i} className="mb-2">
                <p className="font-body text-sm font-medium text-neutral-200">{ed.degree}</p>
                <p className="font-body text-xs text-neutral-500">
                  {ed.school} — {ed.dates}
                </p>
              </div>
            ))}

            <h4 className="mb-1 mt-4 font-body text-xs font-semibold uppercase tracking-wide text-accent">
              Skills
            </h4>
            <p className="font-body text-sm text-neutral-300">
              {upgradedResume.skills?.join(", ")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

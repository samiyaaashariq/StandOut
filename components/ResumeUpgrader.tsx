"use client";
import { useState } from "react";

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

  async function handleSubmit() {
    if (!useAnalyzedText && !file) {
      setError("Choose a .pdf or .docx resume file first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let res: Response;

      if (useAnalyzedText) {
        // Send the already-analyzed resume text directly, no file needed
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

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "upgraded-resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
        {loading ? "Upgrading..." : "Upgrade & download PDF"}
      </button>

      {error && <p className="font-body text-sm text-red-400">{error}</p>}
    </section>
  );
}

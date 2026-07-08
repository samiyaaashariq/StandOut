"use client";

import { useState } from "react";

export default function ResumeUpgrader() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!file) {
      setError("Choose a .pdf or .docx resume file first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (jobDescription.trim()) formData.append("jobDescription", jobDescription);

      const res = await fetch("/api/resume/upgrade", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Request failed");
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
    <section className="mt-10 flex flex-col gap-4 border-t border-neutral-800 pt-8">
      <h2 className="font-display text-xl">Upload & upgrade resume</h2>

      <div>
        <label className="mb-1 block font-body text-sm text-neutral-400">Resume file (.pdf or .docx)</label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-body text-sm text-neutral-300 file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-neutral-950"
        />
      </div>

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={5}
        placeholder="(Optional) Paste a target job description to tailor the rewrite..."
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-body text-sm focus:border-accent focus:outline-none"
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

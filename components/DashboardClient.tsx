"use client";
import { useState, useRef } from "react";
import ResumeOptimizer from "./ResumeOptimizer";
import JobMatcher from "./JobMatcher";
import ResumeUpgrader from "./ResumeUpgrader";
import InterviewPrep from "./InterviewPrep";
import CoverLetterGenerator from "./CoverLetterGenerator";

type Tab = "optimize" | "match" | "upgrade" | "interview" | "cover-letter";

export default function DashboardClient() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("optimize");
  const upgraderRef = useRef<HTMLDivElement>(null);

  function handleUpgradeRequested(text: string, jd: string) {
    setResumeText(text);
    setJobDescription(jd);
    setActiveTab("upgrade");
    setTimeout(() => {
      upgraderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "optimize", label: "Resume Optimizer" },
    { id: "match", label: "Job Matching" },
    { id: "upgrade", label: "Resume Upgrade" },
    { id: "cover-letter", label: "Cover Letter" },
    { id: "interview", label: "Interview Prep" },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="glass-card flex flex-wrap gap-1 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl px-4 py-2.5 font-body text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-accent text-neutral-950"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "optimize" && (
        <ResumeOptimizer
          onResumeTextChange={setResumeText}
          onUpgradeRequested={handleUpgradeRequested}
        />
      )}

      {activeTab === "match" && <JobMatcher resumeText={resumeText} />}

      {activeTab === "upgrade" && (
        <div ref={upgraderRef}>
          <ResumeUpgrader
            initialResumeText={resumeText}
            initialJobDescription={jobDescription}
          />
        </div>
      )}

      {activeTab === "cover-letter" && (
        <CoverLetterGenerator
          initialResumeText={resumeText}
          initialJobDescription={jobDescription}
        />
      )}

      {activeTab === "interview" && (
        <InterviewPrep
          initialResumeText={resumeText}
          initialJobDescription={jobDescription}
        />
      )}
    </div>
  );
}

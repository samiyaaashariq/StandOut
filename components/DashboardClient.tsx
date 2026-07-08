"use client";

import { useState } from "react";
import ResumeOptimizer from "./ResumeOptimizer";
import JobMatcher from "./JobMatcher";

export default function DashboardClient() {
  const [resumeText, setResumeText] = useState("");

  return (
    <>
      <ResumeOptimizer onResumeTextChange={setResumeText} />
      <JobMatcher resumeText={resumeText} />
    </>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Question = { id: string; type: string; question: string };
type Feedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  example_answer: string;
};
type AnswerRecord = {
  question: Question;
  transcript: string;
  feedback: Feedback | null;
};

export default function InterviewPrep({
  initialResumeText = "",
  initialJobDescription = "",
}: {
  initialResumeText?: string;
  initialJobDescription?: string;
}) {
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [stage, setStage] = useState<"setup" | "loading" | "interview" | "feedback" | "summary">("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
  }, []);

  function speakQuestion(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function handleGenerateQuestions() {
    if (!resumeText.trim()) {
      setError("Paste your resume text first.");
      return;
    }
    setError(null);
    setStage("loading");
    try {
      const res = await fetch("/api/interview/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDescription || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to generate questions");
      const data = await res.json();
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setStage("interview");
      setTimeout(() => speakQuestion(data.questions[0].question), 400);
    } catch (e: any) {
      setError(e.message);
      setStage("setup");
    }
  }

  function toggleRecording() {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }

  async function submitAnswer() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
    if (!transcript.trim()) {
      setError("Record an answer first.");
      return;
    }
    setError(null);
    setStage("loading");
    try {
      const currentQuestion = questions[currentIndex];
      const res = await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion.question, answer: transcript }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to get feedback");
      const feedback: Feedback = await res.json();
      setCurrentFeedback(feedback);
      setAnswers((prev) => [...prev, { question: currentQuestion, transcript, feedback }]);
      setStage("feedback");
    } catch (e: any) {
      setError(e.message);
      setStage("interview");
    }
  }

  function nextQuestion() {
    setTranscript("");
    setCurrentFeedback(null);
    if (currentIndex + 1 < questions.length) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setStage("interview");
      setTimeout(() => speakQuestion(questions[next].question), 400);
    } else {
      setStage("summary");
    }
  }

  const avgScore =
    answers.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.feedback?.score ?? 0), 0) / answers.length)
      : 0;

  return (
    <section className="flex flex-col gap-6">
      {/* SETUP STAGE */}
      {stage === "setup" && (
        <div className="glass-card animate-card-enter flex flex-col gap-4 p-8">
          <div>
            <h2 className="font-display text-2xl">Mock Interview Practice</h2>
            <p className="mt-1 font-body text-sm text-neutral-400">
              Speak your answers out loud, just like a real interview. Get instant AI feedback.
            </p>
          </div>

          {!speechSupported && (
            <p className="rounded-lg bg-yellow-500/10 p-3 font-body text-xs text-yellow-400">
              Voice input works best in Chrome or Edge. Your browser may not support it — you can still type your resume below to generate questions.
            </p>
          )}

          <div>
            <label className="mb-1 block font-body text-sm text-neutral-400">Resume text</label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={8}
              placeholder="Paste your resume text here..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-body text-sm text-neutral-400">
              Target job description (optional)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={5}
              placeholder="Paste a job description to tailor the interview questions..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 font-body text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <button
            onClick={handleGenerateQuestions}
            className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim"
          >
            Start mock interview →
          </button>

          {error && <p className="font-body text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* LOADING STAGE */}
      {stage === "loading" && (
        <div className="glass-card animate-card-enter flex flex-col items-center justify-center gap-4 p-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-700 border-t-accent" />
          <p className="font-body text-sm text-neutral-400">Thinking...</p>
        </div>
      )}

      {/* INTERVIEW STAGE */}
      {stage === "interview" && questions.length > 0 && (
        <div className="glass-card animate-card-enter flex flex-col gap-6 p-8">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-body text-xs uppercase tracking-wide text-neutral-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 font-body text-xs text-accent">
                {questions[currentIndex].type}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="animate-progress-fill h-full bg-accent transition-all"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <p className="font-display text-xl leading-relaxed text-neutral-100">
            {questions[currentIndex].question}
          </p>

          <button
            onClick={() => speakQuestion(questions[currentIndex].question)}
            className="self-start font-body text-xs text-neutral-500 underline hover:text-accent"
          >
            🔊 Hear question again
          </button>

          <div className="flex flex-col items-center gap-4 py-6">
            <button
              onClick={toggleRecording}
              disabled={!speechSupported}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl transition disabled:opacity-40 ${
                isRecording
                  ? "animate-mic-pulse bg-red-500 text-white"
                  : "bg-accent text-neutral-950 hover:bg-accent-dim"
              }`}
            >
              {isRecording ? "⏹" : "🎙"}
            </button>
            <p className="font-body text-xs text-neutral-500">
              {isRecording ? "Listening... click to stop" : "Click the mic to speak your answer"}
            </p>
          </div>

          {transcript && (
            <div className="rounded-lg bg-neutral-950/60 p-4">
              <p className="mb-1 font-body text-xs text-neutral-500">Your answer (live transcript):</p>
              <p className="font-body text-sm text-neutral-200">{transcript}</p>
            </div>
          )}

          <button
            onClick={submitAnswer}
            disabled={!transcript.trim()}
            className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim disabled:opacity-40"
          >
            Submit answer
          </button>

          {error && <p className="font-body text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* FEEDBACK STAGE */}
      {stage === "feedback" && currentFeedback && (
        <div className="glass-card animate-card-enter flex flex-col gap-6 p-8">
          <div className="flex items-baseline gap-3">
            <span className="glow-text font-display text-5xl text-accent">
              {currentFeedback.score}
            </span>
            <span className="font-body text-sm text-neutral-400">/ 100</span>
          </div>

          <div>
            <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">Strengths</h3>
            <ul className="list-inside list-disc font-body text-sm text-neutral-300">
              {currentFeedback.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-body text-sm font-medium text-neutral-200">
              What to improve
            </h3>
            <ul className="list-inside list-disc font-body text-sm text-neutral-300">
              {currentFeedback.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-neutral-950/60 p-4">
            <p className="mb-1 font-body text-xs text-neutral-500">A stronger example answer:</p>
            <p className="font-body text-sm text-accent">{currentFeedback.example_answer}</p>
          </div>

          <button
            onClick={nextQuestion}
            className="self-start rounded-full bg-accent px-6 py-2.5 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim"
          >
            {currentIndex + 1 < questions.length ? "Next question →" : "See summary →"}
          </button>
        </div>
      )}

      {/* SUMMARY STAGE */}
      {stage === "summary" && (
        <div className="glass-card animate-card-enter flex flex-col gap-6 p-8">
          <h2 className="font-display text-2xl">Session Summary</h2>

          <div className="flex items-baseline gap-3">
            <span className="glow-text font-display text-5xl text-accent">{avgScore}</span>
            <span className="font-body text-sm text-neutral-400">/ 100 average score</span>
          </div>

          <div className="flex flex-col gap-4">
            {answers.map((a, i) => (
              <div key={i} className="rounded-lg bg-neutral-950/60 p-4">
                <p className="mb-1 font-body text-xs text-neutral-500">{a.question.question}</p>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-accent">{a.feedback?.score}</span>
                  <span className="font-body text-xs text-neutral-500">/ 100</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setStage("setup");
              setQuestions([]);
              setAnswers([]);
              setTranscript("");
            }}
            className="self-start rounded-full border border-accent px-6 py-2.5 font-body text-sm font-medium text-accent transition hover:bg-accent hover:text-neutral-950"
          >
            Practice again
          </button>
        </div>
      )}
    </section>
  );
}

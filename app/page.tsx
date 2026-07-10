import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-6 font-body text-xs font-medium uppercase tracking-widest text-accent">
        Career + Automation
      </span>

      <h1 className="font-display text-6xl font-semibold text-neutral-100 sm:text-7xl">
        StandOut
      </h1>

      <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-neutral-400">
        Resume scoring, job matching, and interview prep, grounded in your
        actual resume and the actual job description.
      </p>

      <Link
        href="/dashboard"
        className="mt-10 rounded-full bg-accent px-8 py-3 font-body text-sm font-semibold text-neutral-950 transition hover:bg-accent-dim"
      >
        Get started
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 font-body text-xs font-medium text-accent">
          AI-powered career toolkit
        </span>

        <h1 className="font-display text-5xl font-semibold leading-tight text-neutral-100 sm:text-6xl">
          Land your next job,
          <br />
          <span className="glow-text text-accent">smarter.</span>
        </h1>

        <p className="max-w-xl font-body text-lg text-neutral-400">
          Optimize your resume, match it against real job descriptions, upgrade
          it with AI, and practice interviews out loud — all in one place.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-full bg-accent px-8 py-3 font-body text-sm font-semibold text-neutral-950 transition hover:bg-accent-dim"
          >
            Get started - it's free
          </Link>
          
            href="#features"
            className="rounded-full border border-neutral-800 px-8 py-3 font-body text-sm font-medium text-neutral-300 transition hover:border-accent hover:text-accent"
          >
            See how it works
          </a>
        </div>
      </div>

      <div id="features" className="mx-auto mt-32 grid max-w-5xl gap-6 sm:grid-cols-2">
        <FeatureCard
          badge="01"
          title="Resume Optimizer"
          description="Get an instant ATS score, missing keyword analysis, and specific bullet-point rewrites - grounded in your actual resume text."
        />
        <FeatureCard
          badge="02"
          title="Job Matching"
          description="Paste a job description or URL. We use similarity search to score your fit and surface exactly where you're strong and where you're not."
        />
        <FeatureCard
          badge="03"
          title="Resume Upgrade"
          description="Upload your resume, get a fully rewritten, ATS-optimized version tailored to a target role - delivered as a polished PDF."
        />
        <FeatureCard
          badge="04"
          title="Interview Practice"
          description="Speak your answers out loud to AI-generated interview questions. Get scored feedback and stronger example answers, instantly."
        />
      </div>

      <p className="mt-24 font-body text-xs text-neutral-600">
        Built with Next.js, Gemini, Supabase, and Clerk.
      </p>
    </main>
  );
}

function FeatureCard({
  badge,
  title,
  description,
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card animate-card-enter flex flex-col gap-3 p-8">
      <span className="font-display text-sm text-accent/60">{badge}</span>
      <h3 className="font-display text-xl text-neutral-100">{title}</h3>
      <p className="font-body text-sm leading-relaxed text-neutral-400">{description}</p>
    </div>
  );
}

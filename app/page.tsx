import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-body text-sm uppercase tracking-[0.2em] text-accent">
        Career + Automation
      </p>
      <h1 className="font-display text-4xl font-medium sm:text-6xl">
         StandOut
      </h1>
      <p className="max-w-md font-body text-neutral-400">
        Resume scoring, job matching, cover letters, and interview prep —
        grounded in your actual resume and the actual job description.
      </p>

      <SignedOut>
        <SignInButton mode="modal">
          <button className="mt-4 rounded-full bg-accent px-6 py-3 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim">
            Get started
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="mt-4 rounded-full bg-accent px-6 py-3 font-body text-sm font-medium text-neutral-950 transition hover:bg-accent-dim"
        >
          Go to dashboard
        </Link>
      </SignedIn>
    </main>
  );
}

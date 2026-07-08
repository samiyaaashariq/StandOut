# AI Job Hunter

Resume optimization, job matching, cover letters, LinkedIn/portfolio review, and
interview prep — grounded in your actual resume and target job description via RAG.

## Stack
Next.js 14 (App Router) · Clerk (auth) · Supabase + pgvector (DB + embeddings) ·
OpenAI (gpt-4o + text-embedding-3-small) · Firecrawl (scraping)

## Setup (do this first, ~15 min)

1. **Install deps**
   ```
   npm install
   ```

2. **Clerk** — create an app at https://dashboard.clerk.com, copy the publishable +
   secret keys into `.env.local`.

3. **Supabase** — create a project at https://supabase.com/dashboard, then:
   - Go to SQL Editor → paste the contents of `supabase/schema.sql` → Run
   - Copy Project URL + anon key + service role key into `.env.local`

4. **OpenAI** — copy an API key from https://platform.openai.com/api-keys into `.env.local`

5. **Firecrawl** — copy an API key from https://firecrawl.dev into `.env.local`
   (needed starting Day 5, not required to run Day 1-2)

6. Copy the example env file and fill it in:
   ```
   cp .env.local.example .env.local
   ```

7. Run it:
   ```
   npm run dev
   ```
   Visit http://localhost:3000, sign in, go to `/dashboard`, paste a resume, hit
   Analyze.

## Build plan (this week)

- [x] **Day 1-2 — Foundation + Feature 1: Resume Optimizer**
      Auth, DB schema, `/api/resume/optimize`, working UI.
- [x] **Day 3-4 — Feature 2: Job Matching**
      Firecrawl pulls/parses a JD (or paste it directly) → embed JD + resume →
      `match_job_chunks_scoped` RAG query → ranked fit score + gap list.
      *(scaffolded — you're here. Re-run `supabase/schema.sql` if you already ran it
      before this update — it adds the `match_job_chunks_scoped` function.)*
- [ ] **Day 5-6 — Feature 3: Auto-generated Cover Letters**
      Reuses resume + JD context from matching → generates an editable draft.
- [ ] **Day 7 — Feature 4: LinkedIn Profile Review**
      Firecrawl scrapes public profile → same critique pipeline as the resume optimizer.
- [ ] **Day 8 — Feature 5: Portfolio Feedback**
      Accepts a portfolio/GitHub URL → Firecrawl scrape → OpenAI critique.
- [ ] **Day 9-10 — Feature 6: Interview Prep**
      Generates likely questions from JD + resume gaps, mock Q&A loop.
- [ ] **Day 11-14 — Polish**
      Unified dashboard nav, history views, deploy to Vercel, record a demo, write
      the "why I built this" section below for your resume/portfolio.

## Why this project (fill in once built, use it in interviews)

_A sentence or two on the problem, the RAG design decision, and one hard bug you
hit and fixed — this is what makes it a talking point, not just a repo._

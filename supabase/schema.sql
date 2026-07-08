-- Run this in Supabase SQL editor (Project -> SQL Editor -> New query)

-- Enable pgvector for RAG embeddings
create extension if not exists vector;

-- Users are managed by Clerk; we just reference their Clerk user id (text) everywhere.

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  raw_text text not null,
  file_name text,
  created_at timestamptz default now()
);

create table if not exists resume_embeddings (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references resumes(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text,
  company text,
  source_url text,
  description text not null,
  created_at timestamptz default now()
);

create table if not exists job_embeddings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create table if not exists optimizations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  resume_id uuid references resumes(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  ats_score int,
  suggestions jsonb,
  created_at timestamptz default now()
);

create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  resume_id uuid references resumes(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  content text,
  created_at timestamptz default now()
);

create table if not exists profile_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source_type text check (source_type in ('linkedin','portfolio')),
  source_url text,
  feedback jsonb,
  created_at timestamptz default now()
);

create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  job_id uuid references jobs(id) on delete set null,
  questions jsonb,
  transcript jsonb,
  created_at timestamptz default now()
);

-- Simple cosine-similarity search function used by the RAG matching step
create or replace function match_job_chunks(query_embedding vector(1536), match_count int)
returns table(job_id uuid, chunk_text text, similarity float)
language sql stable
as $$
  select job_id, chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from job_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Scoped version used by /api/jobs/match: restricts the similarity search to one
-- job's chunks, so scoring one resume against many saved jobs doesn't cross-contaminate.
create or replace function match_job_chunks_scoped(query_embedding vector(1536), target_job_id uuid, match_count int)
returns table(chunk_text text, similarity float)
language sql stable
as $$
  select chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from job_embeddings
  where job_id = target_job_id
  order by embedding <=> query_embedding
  limit match_count;
$$;


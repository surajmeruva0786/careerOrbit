-- CareerOrbit schema, per docs/PLAN.md §4.
-- RLS is enabled on every table with no anon/authenticated policies:
-- only the server (service_role key) can read/write. This is a
-- single-user private tool, not a multi-tenant app.

create extension if not exists pgcrypto;

create table profile (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  location text,
  links jsonb not null default '{}'::jsonb,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  publications jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  awards jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  screening_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profile enable row level security;

create table jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,        -- 'greenhouse' | 'lever' | 'rss'
  source_id text not null,     -- id/slug from the source, for dedupe
  company text not null,
  title text not null,
  location text,
  url text not null,
  description text,
  posted_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  unique (source, source_id)
);
alter table jobs enable row level security;

create table rankings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  profile_id uuid not null references profile(id) on delete cascade,
  fit_score numeric not null,
  friction_score numeric not null,
  reasoning text,
  created_at timestamptz not null default now(),
  unique (job_id, profile_id)
);
alter table rankings enable row level security;

create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  profile_id uuid not null references profile(id) on delete cascade,
  ranking_id uuid references rankings(id) on delete set null,
  resume_version_id uuid, -- FK added below, after resume_versions exists
  status text not null default 'discovered'
    check (status in (
      'discovered', 'ranked', 'tailored', 'pending_review', 'approved',
      'submitted', 'awaiting_reply', 'completed', 'rejected', 'skipped'
    )),
  submission_method text check (submission_method in ('api', 'manual')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table applications enable row level security;

create table resume_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profile(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  is_base boolean not null default false,
  content jsonb not null,
  diff_from_base jsonb,
  created_at timestamptz not null default now()
);
alter table resume_versions enable row level security;

alter table applications
  add constraint applications_resume_version_id_fkey
  foreign key (resume_version_id) references resume_versions(id) on delete set null;

create table application_fields (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  field_name text not null,
  field_value text,
  source text not null check (source in ('profile', 'inferred', 'user_email_reply')),
  created_at timestamptz not null default now(),
  unique (application_id, field_name)
);
alter table application_fields enable row level security;

create table email_threads (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  gmail_thread_id text,
  gmail_message_id text,
  field_name text not null,
  question text not null,
  status text not null default 'sent' check (status in ('sent', 'replied', 'resolved')),
  created_at timestamptz not null default now()
);
alter table email_threads enable row level security;

create index jobs_discovered_at_idx on jobs (discovered_at desc);
create index rankings_fit_score_idx on rankings (fit_score desc);
create index applications_status_idx on applications (status);

# Changelog

Running log of what's been added to this repo and why. Newest first.

## 2026-08-14 — Build started (28-step plan)

User approved the plan with one change: no automated LinkedIn DMs or
unattended bulk auto-apply. That path is explicitly excluded from this
build — see conversation-log.md Turn 4 for the reasoning (ban risk,
spam to recipients, and it doesn't actually solve the bottleneck).
Building the ToS-safe pipeline instead: official ATS APIs + RSS
sourcing, Claude-based ranking/tailoring, a human-approval review
dashboard, API-based submission where available, and manual-assist
packets everywhere else. LinkedIn gets a personalized-note *generator*
only — the user sends messages themselves.

- **Step 1/28 — Scaffolded the dashboard app.** `app/` is a Next.js
  (TypeScript, App Router, Tailwind) project, deployable to Vercel.
  This will become the review dashboard from PLAN.md §3.
- **Step 2/28 — Provisioned Supabase.** Created the `careerorbit`
  project (ap-south-1, free tier, $0/mo) in the `orbissystems` org —
  answers PLAN.md open decision #5. Added `src/lib/supabase/client.ts`
  (browser, anon key, RLS-bound) and `server.ts` (service_role key,
  server-only). `.env.example` documents every secret the app needs;
  `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` still need to be
  filled in by hand (not something I can provision on your behalf).
- **Step 3/28 — Applied the DB schema.** All 7 tables from PLAN.md §4
  (`profile`, `jobs`, `rankings`, `applications`, `resume_versions`,
  `application_fields`, `email_threads`) are live with RLS enabled and
  no anon policies — only the server can touch them. Migration is
  checked into `app/supabase/migrations/0001_init.sql` so it's
  reproducible outside this session.
- **Step 4/28 — Seeded your profile.** Parsed `resume.pdf` into
  structured JSON (education, experience, projects, publications,
  skills, awards, certifications) and inserted it as the one `profile`
  row, plus an `is_base=true` `resume_versions` row that per-job
  tailored versions will diff against going forward. The structured
  copy with your phone/email (`profile.seed.json`) is gitignored and
  lives only in Supabase, not in git — `profile.seed.example.json`
  (placeholder data) is committed instead so the shape is documented
  without adding another copy of your PII to repo history. Note:
  `resume.pdf` itself was already committed to this repo in an earlier
  session, before this repo-visibility question was raised — see the
  still-open repo-visibility item below.
- **Confirmed via GitHub API: this repo is still public**, and now
  contains `resume.pdf` with phone/email. I have no GitHub token/CLI
  access in this environment to change it — **user action needed**:
  Settings → General → Danger Zone → Change visibility to private.
- **Step 5/28 — Setup docs.** Added a top-level `README.md` pointing at
  `docs/` and `app/`, and rewrote `app/README.md` with real setup
  steps (env vars, profile seeding, dev server) in place of the
  `create-next-app` boilerplate.
- **Step 6/28 — Greenhouse sourcing connector.** `src/lib/sourcing/greenhouse.ts`
  polls the public Greenhouse Job Board API for 17 curl-verified board
  tokens (Anthropic, Stripe, Databricks, Scale AI, Coinbase, Figma,
  MongoDB, GitLab, Cloudflare, and others), filtered to internship
  postings. First filter pass (`/intern/i`) had false positives on
  "International"/"Internal" job titles — fixed with a word-boundary
  regex and re-verified: 16 real, currently-open internship postings
  returned live as of today. Company list lives in
  `src/lib/sourcing/companies.ts`, easy to extend.
- **Step 7/28 — Lever sourcing connector.** `src/lib/sourcing/lever.ts`,
  same pattern against the public Lever Postings API. 6 curl-verified
  board tokens (Palantir, Plaid, Lever, Carbon Health, Ro, Whoop).
  Verified live: 41 real, currently-open internship postings from
  Palantir alone.
- **Step 8/28 — RSS career-feed poller.** `src/lib/sourcing/rss.ts`,
  third ToS-safe source per PLAN.md §5.2. Parses public job-board RSS
  feeds (We Work Remotely, curl-verified) with fast-xml-parser.
  Verified live: 1 real, currently-open internship posting returned.
- **Step 9/28 — Sourcing orchestrator.** `src/lib/sourcing/orchestrator.ts`
  runs all three connectors in parallel, dedupes by `(source, source_id)`,
  upserts into `jobs`. Verified today: 58 real postings fetched, 58
  unique after dedupe. The DB write itself needs
  `SUPABASE_SERVICE_ROLE_KEY`, which the Supabase MCP tools don't
  expose (by design) — needs the user to fill it in from the Supabase
  dashboard before the pipeline can write real data end to end.
- **Step 10/28 — Scheduled sourcing.** `/api/cron/source` calls
  `runSourcing()`, gated by a `CRON_SECRET` bearer check. `vercel.json`
  schedules it daily (Hobby plan caps crons at once/day; tighten later
  on a paid plan). `next build` passes and registers the route.
- **Step 11/28 — Claude fit/friction scorer.** `src/lib/ranking/score.ts`
  forces a `submit_score` tool call so Claude always returns structured
  `fit_score`/`friction_score`/`reasoning` (per PLAN.md §6: fit on real
  domain/seniority overlap, friction inferred only from posting
  language). Type-checks and builds clean; not yet run against the
  live API — needs `ANTHROPIC_API_KEY`.
- **Step 12/28 — Ranking pipeline.** `src/lib/ranking/pipeline.ts`
  scores every unranked job, stores every score, and promotes postings
  at/above `RANKING_FIT_THRESHOLD` (default 55) into `applications`
  (status `ranked`) — the volume control from PLAN.md §6. Added and
  applied a unique `(job_id, profile_id)` constraint on `applications`
  so reruns don't duplicate.
- **Step 13/28 — Scheduled ranking.** `/api/cron/rank` calls
  `runRanking()`, scheduled 30 min after sourcing. Idempotent, so a
  Hobby-plan 60s timeout on a big backlog just means the next tick
  continues where the last one stopped.
- **Step 14/28 — Resume tailoring generator.** `src/lib/tailoring/tailor.ts`
  reorders/rewords real experience and projects for a specific posting.
  `assertNoFabrication()` is a hard post-generation check — throws if
  the model's output introduces an org/project name not present in the
  base resume, enforcing the "never fabricate" rule in code rather than
  trusting the prompt alone.
- **Step 15/28 — Versioned resume diff storage.** `diffResume()`
  produces a structural diff (ordering + per-entry bullet changes) for
  the dashboard. `runTailoring()` tailors every `ranked` application,
  stores the result + diff as a `resume_versions` row, links it, and
  advances status to `tailored`. Wired to `/api/cron/tailor`, scheduled
  after ranking. Note: Vercel's exact cron-count limit on the Hobby
  plan is unconfirmed from here — if step 27's deploy hits it, crons
  will get consolidated then.
- **Step 16/28 — Dashboard job list UI.** `/` (force-dynamic, never
  statically prerendered) lists applications needing review sorted by
  fit_score, plus a collapsed history section. `getApplicationsByStatus()`
  joins jobs/rankings/resume_versions in one query.
- **Step 17/28 — Resume diff viewer.** Collapsible `ResumeDiff`
  component shows per-entry bullet changes (struck-through before,
  highlighted after), reordering, and the generated cover note, so you
  can see exactly what changed before approving.
- **Fixed a bug from step 15**: `runTailoring()` was advancing
  applications to `status: "tailored"`, but the review dashboard's
  approve/reject actions only ever look for `pending_review` — so
  tailored applications reached the dashboard but couldn't actually be
  actioned. Now sets `pending_review`.
- **Step 18/28 — Approve/reject buttons.** `ApplicationCard` now
  renders the two buttons as plain `<form action={...}>` submissions
  wired to the `approveApplication`/`rejectApplication` server actions
  (which already existed in `app/actions.ts`, unwired). Only shown for
  applications still awaiting review; history items stay read-only.

## 2026-08-11

- Added `docs/PLAN.md`: detailed architecture and build-phase plan for the sourcing → ranking → tailoring → review → submission → email-Q&A pipeline, plus a risk register and a list of open decisions that need sign-off before Phase 1+ is built.
- Added `docs/conversation-log.md`: transcript of the originating planning conversation (held on claude.ai web) that led to this repo's creation and its name.
- Confirmed via GitHub API that this repository is currently **public** — flagged in PLAN.md as an open decision before committing resume/profile data.
- Confirmed the Gmail integration available in this environment supports creating/updating drafts only, not sending — flagged in PLAN.md §8 as it directly affects how the "email me for missing info" loop can be implemented.

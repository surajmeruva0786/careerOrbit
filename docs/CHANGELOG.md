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

## 2026-08-11

- Added `docs/PLAN.md`: detailed architecture and build-phase plan for the sourcing → ranking → tailoring → review → submission → email-Q&A pipeline, plus a risk register and a list of open decisions that need sign-off before Phase 1+ is built.
- Added `docs/conversation-log.md`: transcript of the originating planning conversation (held on claude.ai web) that led to this repo's creation and its name.
- Confirmed via GitHub API that this repository is currently **public** — flagged in PLAN.md as an open decision before committing resume/profile data.
- Confirmed the Gmail integration available in this environment supports creating/updating drafts only, not sending — flagged in PLAN.md §8 as it directly affects how the "email me for missing info" loop can be implemented.

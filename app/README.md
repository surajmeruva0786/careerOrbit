# CareerOrbit — dashboard app

Sourcing → ranking → tailoring → review → submission → email-Q&A
pipeline for internship applications. See [../docs/PLAN.md](../docs/PLAN.md)
for the full architecture and [../docs/CHANGELOG.md](../docs/CHANGELOG.md)
for build history.

**What this does automatically vs. what it doesn't:** sources postings
from official ATS APIs (Greenhouse, Lever) and RSS feeds, ranks and
tailors your resume with Claude, and lets you approve each one from a
dashboard. It submits directly via API where a public one exists;
everywhere else (including LinkedIn) it prepares the materials and
hands you a one-click link — it does not log into LinkedIn or send
messages/applications on your behalf. See docs/conversation-log.md
Turn 4 for why.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already
     set for the live `careerorbit` Supabase project (ap-south-1).
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Project
     Settings → API. Needed for any server-side write (sourcing,
     ranking, seeding). Not committed anywhere; get it yourself.
   - `ANTHROPIC_API_KEY` — from console.anthropic.com. Used server-side
     for ranking and resume tailoring.
   - `DASHBOARD_PASSWORD` — picks the password that gates the review
     dashboard (HTTP Basic Auth, see `src/proxy.ts`). If unset, the
     dashboard is reachable with no auth — fine for local dev, but set
     this before deploying anywhere public.
3. (Once, or whenever your resume changes) copy
   `src/data/profile.seed.example.json` to `src/data/profile.seed.json`,
   fill in your real details (gitignored — never committed), then:
   ```bash
   node --env-file=.env.local scripts/seed-profile.mjs
   ```
4. `npm run dev` and open http://localhost:3000

## Deploying

Deployed to Vercel (see docs/CHANGELOG.md for when). Set the same env
vars in the Vercel project settings — they are not synced from
`.env.local` automatically.

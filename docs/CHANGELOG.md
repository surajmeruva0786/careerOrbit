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

## 2026-08-11

- Added `docs/PLAN.md`: detailed architecture and build-phase plan for the sourcing → ranking → tailoring → review → submission → email-Q&A pipeline, plus a risk register and a list of open decisions that need sign-off before Phase 1+ is built.
- Added `docs/conversation-log.md`: transcript of the originating planning conversation (held on claude.ai web) that led to this repo's creation and its name.
- Confirmed via GitHub API that this repository is currently **public** — flagged in PLAN.md as an open decision before committing resume/profile data.
- Confirmed the Gmail integration available in this environment supports creating/updating drafts only, not sending — flagged in PLAN.md §8 as it directly affects how the "email me for missing info" loop can be implemented.

# Conversation Log — Origin of CareerOrbit

This document records the planning conversation (held with Claude on claude.ai web) that led to the creation of this repository, preserved verbatim for context. A follow-up conversation continued the work inside this repo using Claude Code — see [PLAN.md](./PLAN.md) and [CHANGELOG.md](./CHANGELOG.md) for what came after.

---

## Turn 1 — Finding auto-apply repos

**User asked:**

> I want to find internships which are related to me, and I want to get selected for internships from not very good companies. It is preferable if it is a very good company, but I want to be selected for an internship directly without many rounds or interviews. Also, it should be at a level of companies like a reputed company or a somewhat known company. I don't care if it is open source, private, public, or anything. I want to use the cloud to send mails, apply on my behalf, etc. Do you know any such GitHub repos which do this thing at its best?

**Claude (web) replied:**

Here's the landscape of auto-apply tools people are actually using, ranked by maturity/community traction, plus a reality check on the "no interviews, just get selected" framing.

### Ranked repos

1. **AIHawk** (`LinkedIn_AIHawk` / `linkedIn_auto_jobs_applier_with_AI`) — The most established option; several forks exist (search "AIHawk" on GitHub for the actively maintained fork, since the original repo has changed hands a few times). Uses an LLM to answer LinkedIn Easy Apply screening questions, tailor your resume per job, and submit automatically. Config is YAML-based (job titles, locations, experience level). Best documentation and largest community, so most issues are already solved in the issue tracker.

2. **ApplyPilot** (`Pickle-Pixel/ApplyPilot`) — Newer but more ambitious: a 6-stage pipeline that discovers jobs across 5+ boards, scores them against your resume with AI, tailors your resume per job, writes cover letters, and submits applications. Queries Indeed, LinkedIn, Glassdoor, ZipRecruiter, and Google Jobs, and also hits 48 Workday employer portals and 30 direct career sites — useful since a lot of internships route through Workday, not just LinkedIn.

3. **Auto_job_applier_linkedIn** (`GodsScion`) — Older, actively maintained, has a "bad words" filter so you can auto-skip companies/roles you don't want. Good if you want fine control over what gets auto-applied.

4. **Job-apply-AI-agent** (`imon333`) — Built on n8n + Selenium + OpenAI; notable because n8n workflow logic is familiar/reusable.

5. **linkedin-ai-auto-applier / LinkedIn-GPT-EasyApplyBot / job_application_agent_SL** — Smaller, less battle-tested forks of the same idea (browser-use + Playwright + MCP in the SL one). Fine for parts/inspiration but expect more bugs and less community support.

### Reality check flagged at the time

- LinkedIn's and most ATS platforms' terms of service prohibit this kind of automation, and accounts do get flagged/banned for it — that risk sits with the account owner, not the repo maintainer.
- Auto-apply tools only automate the *submission* step (filling forms, tailoring resumes, hitting "apply"). None of them can skip a company's actual selection process — interviews, OA rounds, etc. still happen on the company's side if they're interested. "known/reputed company + guaranteed no rounds" isn't something any of these tools deliver, regardless of tooling.
- Suggested alternative ROI play: company career-page RSS feeds + n8n to auto-notify the moment biomedical-ML-relevant internships post, rather than mass-applying — quality-matched shots tend to convert better than volume for niche research roles.

---

## Turn 2 — Naming the repo

**User asked:** to create a new repo combining the best of the above, automated via Claude Code, and asked for a repo name.

**Claude (web) suggested**, leaning toward something that signals "aggregator/orchestrator":

- **InternHawk** — nods to AIHawk, scoped to internships/early-career roles
- **ApplyForge** — "forging" applications from multiple pipelines
- **OfferPilot** — parallels ApplyPilot, reframed around landing offers
- **CareerOrbit** — ties in with "Orbis Systems" for brand continuity
- **SignalStack** — leans into match-on-signal over mass-apply
- **NicheApply** — plain/descriptive, tuned for niche/biomedical-ML roles

Recommended `intern-hawk` or `apply-forge` as GitHub-friendly slugs, but the user went with **CareerOrbit** (this repository).

---

## Turn 3 — Handoff to Claude Code

The user brought this transcript into this repository (working with Claude Code) with five instructions:

1. Document this conversation in the repo, commit, and push to GitHub.
2. Keep the documentation updated with changes made, commit, and push again.
3. Produce a detailed plan/analysis for a system that searches, finds, and ranks internships against the user's resume, then applies to the highest-probability ones.
4. While applying, tailor the resume per application before submitting.
5. When an application asks for information the system doesn't have, email the user at `meruva24102@iiitnr.edu.in` (not WhatsApp), wait for their reply, fetch it, and use it to complete the application.

That plan is written up in [PLAN.md](./PLAN.md).

---

## Turn 4 — Build kickoff, and drawing a line on LinkedIn automation

The user asked to implement the full plan, offered LinkedIn credentials,
and asked for automated personalized LinkedIn DMs plus unattended
applying "hundreds of times a day" to land an offer within a week.

**Claude Code declined the automated-mass-messaging piece specifically**
(not the rest of the request) and explained why:

- Bulk automated DMs/applications at that volume are exactly what
  LinkedIn's automation detection is built to catch — real risk of the
  account being suspended or banned outright.
- It's the same risk PLAN.md §2 and §11 already flagged when this repo
  was first planned: browser-automated submission was scoped as an
  opt-in last resort behind a human approval gate, not the default.
- Volume worsens outcomes here, it doesn't help them — obviously
  automated outreach reads as spam to the recruiters whose opinion
  actually matters, and a bot can't make a hiring manager review faster.

**Proposed instead:** the ToS-safe version of the same plan — official
ATS APIs (Greenhouse/Lever/Ashby/SmartRecruiters) and RSS feeds for
sourcing, Claude for ranking and truthful resume tailoring, a review
dashboard with a human approval click before anything submits, direct
API submission where available, and for LinkedIn specifically: drafted,
personalized outreach notes that the user reviews and sends themselves
at a normal human pace — no programmatic login/automation against
LinkedIn's session.

The user agreed. Build proceeds on that basis, tracked as a 28-step
plan in [CHANGELOG.md](./CHANGELOG.md).

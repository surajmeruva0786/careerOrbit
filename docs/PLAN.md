# CareerOrbit — System Plan

Status: **in build** (see docs/CHANGELOG.md for progress). Open decisions below are resolved as of the date noted in each; see that entry for what actually shipped vs. what changed from the original recommendation.

## 1. Goal, restated

Build a pipeline that:
1. **Sources** internship/job postings relevant to your profile (PPG/ECG + segmentation/biomedical-ML research background, per your resume).
2. **Ranks** them against your resume by fit and by estimated chance of a low-friction selection.
3. **Tailors** your resume per application (truthfully — reordering/emphasizing real experience, never fabricating).
4. **Fills and submits** applications, and when a form asks something not in your profile, **emails you**, waits for your reply, and completes the application from it.
5. Keeps a **changelog of itself** in this repo as it evolves.

## 2. Reality check (carried over from the web conversation, still true here)

- No tool — this one included — can get you a reputed-company offer with zero interviews. Automation only compresses the *apply* step. Selection still happens on the company's side.
- LinkedIn, Workday, and most ATS platforms' Terms of Service prohibit automated form-filling/submission. That risk lands on **your account**, not on this codebase. This plan defaults to lower-risk sourcing (official job-board APIs, RSS, direct ATS "posting" APIs) and treats browser-automated submission as an explicit, opt-in, rate-limited last resort — not the default path.
- Two things this plan will **not** do regardless of settings: fabricate experience/credentials on a tailored resume, or auto-send an email that impersonates you without your review of the first few instances.

## 3. Architecture overview

```
 ┌─────────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────────┐
 │  Sourcing    │───▶│  Ranking /    │───▶│  Tailoring      │───▶│  Review       │
 │  (n8n cron)  │    │  Matching     │    │  (resume/cover) │    │  Queue (UI)   │
 └─────────────┘    └───────────────┘    └────────────────┘    └──────┬───────┘
        │                                                              │ you approve
        ▼                                                              ▼
 ┌─────────────┐                                              ┌────────────────┐
 │  Postgres    │◀────────────────────────────────────────────│  Submission     │
 │  (Supabase)  │        writes status back at every stage     │  Worker         │
 └─────────────┘                                              └──────┬─────────┘
        ▲                                                              │ missing field?
        │                                                              ▼
        │                                                     ┌────────────────┐
        └─────────────────────────────────────────────────────│  Email Q&A loop │
                                                                │ (Gmail)         │
                                                                └────────────────┘
```

- **Sourcing**: originally planned as n8n workflows; built instead as Vercel Cron hitting `/api/cron/source` (step 10) — no extra service to run, same schedule-a-poll idea.
- **Ranking**: an LLM (Claude) scores each posting against your structured resume profile, with a numeric fit score + reasoning + an estimated "friction" score (how many rounds/how automatable the process is, inferred from posting text — e.g. "Easy Apply", "no OA mentioned", company size).
- **Tailoring**: Claude rewrites resume bullet emphasis and generates a cover note per posting, from your real experience only.
- **Review Queue**: a small Next.js dashboard (deployable on Vercel) listing every candidate application with a diff of the tailored resume, so you approve/reject before anything is submitted. This is the recommended default — see Open Decisions.
- **Submission Worker**: for postings with a public API (Greenhouse, Lever) it POSTs directly; for everything else it uses Playwright browser automation with your own logged-in session (never credential-stuffing).
- **Email Q&A loop**: when a required field has no answer in your profile, the system emails you a specific question with a reference ID, watches for your reply, parses it, stores the fact in your profile permanently (so it's never asked twice), and resumes the application.
- **Storage**: Supabase Postgres — one place for profile, resume versions, sourced jobs, rankings, tailored artifacts, application status, and the email Q&A thread mapping.

## 4. Data model (Supabase)

| Table | Purpose |
|---|---|
| `profile` | Structured facts about you: education, skills, experience, links, answers to common screening questions (work auth, notice period, etc.) |
| `resume_versions` | Your base resume (parsed from `resume.pdf`) + every tailored variant, versioned and linked to an application |
| `jobs` | Normalized postings from every source: title, company, location, url, source, raw text, posted_at |
| `rankings` | fit_score, friction_score, reasoning, per (job, resume_version) |
| `applications` | state machine: `discovered → ranked → tailored → pending_review → approved → submitted → awaiting_reply → completed → rejected/skipped` |
| `application_fields` | per-application form fields, with source (`profile`, `inferred`, `user_email_reply`) |
| `email_threads` | maps a Gmail thread/message id to an `application_id` + the specific question asked, so replies can be matched back |

## 5. Sourcing strategy, ranked by risk

Lower risk first — this determines build order:

1. **ATS public APIs** (no login, ToS-clean): Greenhouse Job Board API, Lever Postings API, Ashby, SmartRecruiters — many companies expose these without auth.
2. **Company career-page RSS/JSON feeds** via n8n polling — the approach flagged as best-ROI in the original web conversation for niche (biomedical-ML) roles.
3. **Aggregator APIs where available** (e.g. Indeed/Adzuna partner APIs, RemoteOK, WeWorkRemotely feeds).
4. **LinkedIn / Workday / generic career-site scraping** — highest value (most postings live here) but highest ToS/ban risk and the most brittle to build. Build last, gate behind an explicit opt-in, and rate-limit aggressively.

## 6. Ranking & fit scoring

- Parse `resume.pdf` once into structured JSON (skills, projects, publications, experience) — this becomes the canonical profile, editable by you going forward instead of re-parsing the PDF each time.
- For each job, Claude scores: (a) domain fit against your PPG/ECG/segmentation background, (b) seniority match (internship-appropriate), (c) a friction estimate from posting language ("Easy Apply", third-party ATS vs. a 5-page custom form, mentions of OA/case study).
- Only postings above a configurable fit threshold enter the tailoring stage — this is the volume control, and it's where "search all sources" turns into "10 good matches a week" instead of noise.

## 7. Resume tailoring

- Never invents experience. Operates only by: reordering bullets, adjusting emphasis/keywords to mirror the JD's language, selecting which real projects to foreground, and generating a short cover note.
- Every tailored resume is stored as a diff against your base resume in `resume_versions`, visible in the review queue before submission.

## 8. The email Q&A loop (your step 5)

Constraint discovered while planning this: **the Gmail connection available to Claude Code in this environment can create and update drafts, but has no send capability.** So the literal flow "system emails you, you reply, system reads the reply" needs one of:

- **(a) Draft-and-notify**: Claude Code creates a Gmail draft addressed to `meruva24102@iiitnr.edu.in` with the question, and pings you (e.g. via a scheduled check-in) to hit send yourself — adds a manual step but requires no extra credentials.
- **(b) n8n-sent email**: an n8n workflow with real Gmail-send or SMTP credentials sends the question automatically; Claude Code (or another n8n step) polls the inbox for the reply via Gmail search/read and feeds it back into the application. This matches "prompt me by email" literally, but needs you to grant n8n a send-capable Gmail OAuth connection or SMTP creds.
- **(c) A dedicated sending mailbox**: a `careerorbit@yourdomain` address with its own credentials, so questions clearly aren't spoofed from your personal inbox.

Recommendation: **(b)**, since you already run n8n — but it needs you to provision that OAuth grant; I can't do that from here. Whichever option, every outbound question includes a reference ID and the exact field being asked about, and replies are matched by thread ID, not by guessing from free text — reduces the chance of an answer landing on the wrong application.

## 9. Submission worker

- Direct API POST for Greenhouse/Lever-style sources.
- Playwright automation, using your real logged-in browser session (not stored raw credentials), for everything else — with human-like pacing and a hard rate limit per domain per day to reduce ban risk.
- **Default: submission requires your one-click approval in the review dashboard.** Full unattended auto-submit is technically straightforward to add later but is the highest-stakes, least-reversible part of this system (a bad tailored resume or wrong answer goes to a real company under your name) — recommend keeping the human gate at least through the first few weeks, then revisiting.

## 10. Build phases

- **Phase 0 — Foundation**: parse `resume.pdf` → structured profile in Supabase; repo scaffold; this documentation.
- **Phase 1 — Sourcing + ranking (low-risk sources only)**: Greenhouse/Lever APIs + RSS feeds → Vercel Cron → Supabase; ranking job in Claude.
- **Phase 2 — Tailoring + review dashboard**: Next.js/Vercel dashboard showing ranked jobs and tailored-resume diffs; approve/reject actions.
- **Phase 3 — Email Q&A loop**: wire up whichever option from §8 you choose; profile auto-updates from replies.
- **Phase 4 — Submission automation**: API-based submission first (lowest risk), then opt-in Playwright automation for everything else, still behind the approval gate.
- **Phase 5 (optional, later)** — relax the approval gate for sources you've come to trust, per-source, with a kill switch.

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Account bans (LinkedIn/Workday ToS) | Prefer official APIs/RSS; rate-limit browser automation; your own session, not credential automation at scale |
| Resume PII exposure | Keep this **repo private**, or at minimum never commit `resume.pdf` / parsed profile data to a public repo (see Open Decisions — this repo is currently public) |
| Hallucinated resume content | Tailoring is constrained to reordering/emphasis of real, stored facts only; every diff is human-reviewable |
| Wrong answer auto-submitted | Human approval gate by default (§9) |
| Email spoofing/phishing look | Questions always reference a specific application ID; sent from a clearly-labeled sender if using option (c) in §8 |
| Over-applying hurts your reputation with recruiters | Fit-score threshold caps volume; friction/fit scoring favors genuine matches over spray-and-pray |

## Open decisions

1. **Repo visibility** — still **public** as of 2026-08-16 (re-confirmed via GitHub API in changelog step 24). `resume.pdf` (real phone/email) was committed in an earlier session; it's now `.gitignore`d going forward (step 24) but still sits in existing git history. **Still needs your action**: make the repo private (recommended — single click, GitHub Settings → General → Danger Zone), or explicitly approve a git history rewrite + force-push to purge it (destructive, not done without sign-off).
2. **Email sending mechanism** — landed on **(a) draft-and-notify**, not the originally-recommended (b): the deployed app holds no Gmail credentials at all (a personal-inbox OAuth grant isn't worth storing in a serverless app on a still-public repo), so `/api/cron/email-ask` (step 22) only detects questions and queues them in Supabase. Actually drafting/sending and parsing replies is done by the operator (Claude Code, using Gmail MCP tools that need no extra provisioning) rather than by n8n. See CHANGELOG step 22.
3. **Approval gate** — confirmed: review-and-approve before submit, for every source, indefinitely. Additionally, live submission itself was scoped back further than originally planned — see the submission-worker note below.
4. **Sourcing scope for v1** — Greenhouse/Lever/RSS only, as recommended. LinkedIn/Workday scraping was never added; LinkedIn support is a personalized-note generator only, per the Turn 4 decision in conversation-log.md.
5. **Supabase project** — new project provisioned (`careerorbit`, ap-south-1), step 2.

### Submission worker reality check (added 2026-08-16, after step 19)

§9 assumed Greenhouse/Lever expose a public POST-to-apply endpoint the same way they expose public GET job listings. On closer look, they don't: submitting an application through either API requires a per-company opt-in/API key that this system doesn't have and can't provision on its own. So "Direct API POST" isn't currently buildable as unattended automation for arbitrary boards — building it anyway would mean fabricating an integration that doesn't actually work, which this project's own "never fabricate" principle rules out. Step 19 implements the payload-construction/staging half only (dry-run, logged, never POSTed); real submission for every source currently means **you apply by hand** via the posting link the dashboard already surfaces, with the tailored resume/cover note/answers all prepared for you. Revisit if a specific target company turns out to offer real API-apply access.

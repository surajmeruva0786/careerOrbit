# Changelog

Running log of what's been added to this repo and why. Newest first.

## 2026-08-11

- Added `docs/PLAN.md`: detailed architecture and build-phase plan for the sourcing → ranking → tailoring → review → submission → email-Q&A pipeline, plus a risk register and a list of open decisions that need sign-off before Phase 1+ is built.
- Added `docs/conversation-log.md`: transcript of the originating planning conversation (held on claude.ai web) that led to this repo's creation and its name.
- Confirmed via GitHub API that this repository is currently **public** — flagged in PLAN.md as an open decision before committing resume/profile data.
- Confirmed the Gmail integration available in this environment supports creating/updating drafts only, not sending — flagged in PLAN.md §8 as it directly affects how the "email me for missing info" loop can be implemented.

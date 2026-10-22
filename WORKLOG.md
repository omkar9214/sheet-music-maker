# WORKLOG

**Append only. Never rewrite or delete** — `AGENTS.md` §2; the gate fails if an entry committed
before is changed. Newest at the bottom. Format: §2.2.

---

## 2026-10-22 — Claude — decision 1: set up a sheet music maker app

**Type:** decision
**Files:** none — recorded before any file was written
**Did:** Omkar, verbatim (asked in a Guitar Technique Trainer session):

> *"I need you to create a new project for me, An sheet music maker app. I need you to set it up for me. you know how I work and all my protocols for no redundency and no bugs app making process, create the relavent agents md etc.."*

**Inference, marked as inference:**
- "Set it up" = the repo, the rules, the baton, the gate and a running empty shell — not features.
  What the app does is unspecified, so `AGENTS.md` §0 is left blank for him, as the Technique
  Trainer's was.
- Location `/Users/omii/Documents/GitHub/Sheet Music Maker`, beside the guitar apps; name from his
  words. Vite + React + TS, standalone, `main`, no remote — the guitar apps' standing rules.
- "My protocols": the Technique Trainer's `AGENTS.md` §1–4, §7, §9.1–9.13 word for word; its
  session-start/session-end skills; the global user-scenarios skill; his decision-59 rule (ask only
  when drastic, verify with screenshots).
- "No redundancy": one rules file (`CLAUDE.md` points at `AGENTS.md`), skills once (symlinked into
  `.claude/skills`), no guitar code copied in speculatively — `docs/00` points at where it lives.
- "No bugs": a gate from the first commit (`npm run check`), whose repo rules are themselves tested
  on known-bad inputs; seven notation non-negotiables in `AGENTS.md` §5, written by me and marked as
  unruled.
- Ports 5193 (his) and 5194 (agents) — the next free pair after the Technique Trainer's.

**Why:** His instruction.

**Open:** §0 — what the app makes, from what, for whom, and where it ships. The non-negotiables in
§5 are all mine until he rules on them.

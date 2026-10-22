---
name: verify-repo
description: The rules in AGENTS.md a machine can check — core never imports ui, no `any`, WORKLOG.md append-only and well-formed, §0 present. Runs first in `npm run check`. Use when the gate fails, or when adding a rule to it.
---

# verify-repo

`npm run verify` (first step of `npm run check`). Reads the files on disk.

| Check | Rule |
|---|---|
| core never imports ui | AGENTS.md §7.3, docs/00 |
| no any | §7.3 |
| worklog append-only | §2 — the committed `WORKLOG.md` must be a prefix of the one on disk |
| worklog entries well-formed | §2.1–2.2 — a Type on every entry; decisions numbered 1, 2, 3… and quoting him; work entries carry **Verified:** |
| §0 present | the brief's heading cannot be deleted |

**When it fails it is usually right. Fix the cause, never the check** (§9.9).

**Adding a rule:** write it in `rules.mjs` as a pure function over text, and in `rules.test.mjs`
show it firing on a known-bad input and quiet on a good one *before* trusting it (§9.2). Then wire it
in `verify.mjs`. When §0 brings a musical invariant (§5) that can be checked against files — a bar
that does not sum, a respelled pitch in a fixture — it goes here too, identified twice where it is
critical (§9.4).

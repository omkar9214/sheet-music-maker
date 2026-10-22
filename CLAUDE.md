# Sheet Music Maker

@AGENTS.md

The working agreement lives in `AGENTS.md`. There is deliberately only one rules file so agents
cannot drift apart. **Read it in full before anything.**

**Start with §0. It is blank.** Omkar has asked for "a sheet music maker app" and nothing more. Until
he writes the brief, do not write feature logic — build platform, fix defects, prepare seams, ask
questions.

---

## Repo map

| Path | What it is |
|---|---|
| `src/core/**` | Musical truth: spelled keys (`pitch`), key-relative chords and transposition (`chord`), slash-rhythm patterns (`rhythm`), the chart and its edits (`song`), his reference chart (`khwabon`). May never import from `ui/` (the gate checks). |
| `src/ui/engrave/**` | Song → pages (`layout`, pure, tested) and SVG (`Notation`). Geometry measured off his PDF (`metrics`). |
| `src/ui/**` | The editor: the page with typed slots (`Sheet`), chord palette, inspector, top bar, save/undo (`store`). |
| `src/App.tsx` | Wires the store, the layout and the editor. |
| `docs/reference/` | His MuseScore PDF — the definition of "looks like a traditional chart". |
| `skills/verify-repo/` | The gate's first step. Rules in `rules.mjs`, proven in `rules.test.mjs`. |
| `skills/` | Shared skills; `.claude/skills/` symlinks to them. |
| `docs/00-START-HERE.md` | Reading order. |

## Ownership

One agent at a time — `AGENTS.md` §3. Nobody else is in this repo today.

## Commands

```bash
npm run dev     # port 5193 — his. Agents use the "sheet-music-test" preview on 5194.
npm run check   # the gate: verify-repo + tests + typecheck
npm run verify  # the repo rules alone
```

**`npm run check` is the definition of done.** Nothing is reported complete without it, and nothing
user-visible without a screenshot and a live-DOM measurement of what it claims.

## Standing rules for this repo

- **Vite + React + TypeScript, no backend, no Next.js** — `AGENTS.md` §6.
- **No notation library until §0 picks the product** — `NEXT.md` item 1.
- **Git: `main`, no remote.** Commit, never push unless he asks.

# Sheet Music Maker

@AGENTS.md

The working agreement lives in `AGENTS.md`. There is deliberately only one rules file so agents
cannot drift apart. **Read it in full before anything.**

**Start with §0.** It is written (decisions 2–3). The editor was redesigned in decision 5.

---

## Repo map

| Path | What it is |
|---|---|
| `src/core/**` | Musical truth: spelled keys (`pitch`), key-relative chords and transposition (`chord`), slash-rhythm patterns (`rhythm`), the chart and its edits (`song`), his reference chart (`khwabon`). May never import from `ui/` (the gate checks). |
| `src/ui/engrave/**` | Song → pages (`layout`, pure, tested) and SVG (`Notation`). Geometry measured off his PDF (`metrics`). |
| `src/ui/**` | The editor (redesigned, decision 5): the page with bar selection and inline chord entry (`Sheet`), suggestions (`suggest`, tested), the Form panel, the inspector, the top bar, save/undo (`store`). |
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
- **No notation library, by choice** — `AGENTS.md` §6.
- **Git: `main`, no remote.** Commit, never push unless he asks.

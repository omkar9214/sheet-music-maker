# NEXT

The live queue, in order. Meant to be edited — unlike `WORKLOG.md`.

Branch: `main`, no remote. First commit is the scaffold (decision 1).

## Now

0. **Omkar writes `AGENTS.md` §0 — the brief.** Nothing below item 1 can start without it. The
   questions are listed in §0 itself. Recommendation to put to him if he wants one: a notation +
   tab editor for guitar, typed and clicked input, on-screen and PDF output, playback with the
   Technique Trainer's samples — the product the existing code and his other apps make cheapest.
   Inference; he has not said any of it.

1. **Choose the rendering from §0, by measurement, not by reputation.** Candidates (from memory,
   unverified — check licence and maintenance before choosing): VexFlow (low-level SVG engraving),
   OpenSheetMusicDisplay (MusicXML on top of VexFlow), Verovio (WASM engraver, MEI/MusicXML),
   abcjs (ABC text). Render the same three real scores in each — one with tuplets and ties, one
   with tab, one dense — and compare legibility, bundle size and whether it lets non-negotiables
   1–3 hold (our model, their drawing). Or our own SVG if §0 is narrow enough.

2. **Then the core model** (`src/core/score.ts`): exact durations and spelled pitch
   (non-negotiables 1–2) with tests first, before any UI.

3. **Then saving and undo** (non-negotiable 4), before the second feature — retrofitting it is a
   rewrite.

## Open with him

- §0, all of it.
- §5's seven non-negotiables — written by Claude, none ruled.
- Standalone, or eventually vendored into `learnMusicIn` (it changes nothing today; it decides
  whether anything here may assume Vite).

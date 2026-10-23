# NEXT

The live queue, in order. Meant to be edited — unlike `WORKLOG.md`.

Branch: `main`, no remote. §0 is written (decisions 2–3). The editor was redesigned in decision 5
(select, type, the Form panel, a selection-scoped inspector).

## Now

1. **Omkar tries the redesigned editor** on 5193. Everything below waits on what he says.

## Known gaps, in the order they will probably hurt

2. **Spacing is not MuseScore's.** Systems are not spread to fill the page (MuseScore does that),
   so page 1 ends with white space, and Melody falls to page 2 where the PDF has it on page 1.
   Measure against the PDF before tuning (`src/ui/engrave/metrics.ts` says which numbers are
   measured and which are inference).
3. **Undo does not survive a reload.** The chart does. If he wants it, store the stack per chart
   in localStorage, capped.
4. **One cue above and one below per bar.** Two above in one bar is not possible, though the rows
   stack when neighbouring cues collide. The PDF never needed it.
5. **There is no visible keyboard help.** The keys are listed in `App.tsx`'s header comment only.
   If he doesn't discover typing-to-enter, a one-line hint in the empty inspector may be warranted.
   §7.1 says labels only, so ask first.
6. **Chord positions are even slots** (`.` holds). Off-beat pushes (a chord on the "and" of 4) need
   8 slots typed, e.g. `A . . . . . . E`. It works but is clumsy.
7. **Print was checked by applying the print stylesheet on screen** (3 pages at 816×1056 px, the
   UI hidden), not through a real print dialog or a saved PDF. First real print: check the page
   breaks and margins.
8. **No export/import file.** Charts live in this browser only. A JSON download/upload is cheap, but
   it would need a round-trip test (non-negotiable 5).
9. **Note entry: the "second pass" he mentioned.** It is not MVP. When it comes, revisit the no-library
   decision (AGENTS.md §6).

## Open with him

- §5's seven non-negotiables: written by Claude, none ruled.
- Whether a chart should be shareable beyond this browser (that is the only thing that would bring a
  backend).

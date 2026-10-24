# NEXT

The live queue, in order. Meant to be edited — unlike `WORKLOG.md`.

Branch: `main`, no remote. §0 is written (decisions 2–3). The editor was redesigned in decision 5
(select, type, the Form panel, a selection-scoped inspector).

## Now

1. **Omkar tries decision 7**: Charts ▾ → Copy link / Import / Chart file / ChordPro / MusicXML;
   a key, meter or tempo change from the inspector; A / 1 / I and Part in the top bar. Everything below waits on what he says. **Note:** on 2026-10-23 his chart "Bang Bang" was found on **5194**, the agents' port. It
   was backed up before testing and restored after. His port is 5193, and agents must never clear
   5194's storage without checking it first.

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
6. **Written notes are removed** (decision 9: "for now"). The dormant model is `core/notes.ts`, and
   the UI is in commit `009af0b`. If they come back, the earlier gaps come with them: no
   click-to-place, no triplets, one voice, flat beams, and cross-bar ties drawn only to the barline.
7. **MusicXML was not opened in MuseScore.** It is checked for well-formedness and content by tests
   only. First real check: import it into MuseScore 4 and look.
8. **Print was checked by applying the print stylesheet on screen** (3 pages at 816×1056 px, the
   UI hidden), not through a real print dialog or a saved PDF. First real print: check the page
   breaks and margins.
9. **Nothing syncs between devices.** Share links and files do the moving.
10. **Pushes** are ½ in the chord boxes. Check that he finds them.

## Open with him

- §5's seven non-negotiables: written by Claude, none ruled.
- Whether a chart should be shareable beyond this browser (that is the only thing that would bring a
  backend).

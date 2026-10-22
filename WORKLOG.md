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

---

## 2026-10-22 — Claude — work: scaffold — rules, baton, gate, empty shell (decision 1)

**Type:** work
**Files:** `AGENTS.md`, `CLAUDE.md`, `WORKLOG.md`, `NEXT.md`, `README.md`, `docs/00-START-HERE.md`,
`skills/{session-start,session-end,user-scenarios,verify-repo}/`, `.claude/{launch.json,skills/}`,
`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/{main.tsx,App.tsx,styles.css}`

**Did:** `AGENTS.md` assembled from the Technique Trainer's: §1–4, §7, §9.1–9.13 copied as text, not
retyped; §0 blank with the questions a sheet-music brief must answer; §5 seven notation
non-negotiables (mine, marked unruled); §6 the stack and ports; §10 what was left behind and where it
lives. The gate's first step, `verify-repo`, checks core→ui imports, `any`, the worklog append-only
(committed file must be a prefix) and well-formed (Type, decisions 1…n quoting him, work entries
Verified). Its rules are pure functions tested on known-bad input (§9.2). It failed on its first run
— `URL.pathname` keeps the folder's spaces as `%20` — fixed with `fileURLToPath`.

**Verified:**

```
npm run check
EXIT=0 — verify-repo 5 checks passed, 4 tests in 1 file, tsc -b clean
```

- Gate on the real tree, not only its tests: a `src/core` file importing `../ui` with an `any` →
  EXIT=1 naming both; the committed decision-1 title edited → EXIT=1 "an existing entry was edited";
  restored → EXIT=0.
- Pane, 5194: title and heading "Sheet Music Maker", no console errors, no horizontal overflow.
  Screenshot. Server stopped. (Started through a temporary entry in the Technique Trainer's
  `launch.json`, since the session was rooted there; the entry was removed.)

**Open:** §0, and with it everything that is a feature. §5 unruled. No notation library chosen
(`NEXT.md` 1). No remote.

---

## 2026-10-22 — Claude — decision 2: the brief — a fast band chart maker (chords, cues, structure, transpose)

**Type:** decision
**Files:** `AGENTS.md` §0, `docs/reference/Khwabon ke Parindey.pdf`
**Did:** Omkar, verbatim, attaching `Khwabon ke Parindey.pdf`:

> *"Study the attached PDF. I want you to make a sheet music maker app, which the purpose of which is to write down the structure, write down the cues and the chords for a song and key information as well. The chords should come from some kind of menu or something, like you find an elegant way of doing it. I'm leaving that up to you. So I need that feature because I need to be able to transpose the song. So if the key of the song is in F sharp, if I change the key from F sharp to A, everything should be transposed to A. And there are going to be a lot of cues in the song, so you need to find an elegant way to write down the cues. So if I write something, there's already text boxes wherever the space is, and the rhythm is notated. So if you study the chart, it should look exactly like a traditional chart. There should be repeat signs, there should be like 1, 2, 3, 4 endings, maybe coda. So everything should be there. But and the chart that I've sent you is created in MuseScore, but MuseScore is very complicated for me and it's like very sluggish and slow for me. So I need a quick, very quick solution to write all of this down. So the rhythm should be, I'm not dealing with individual notes, although we can like on the second pass add individual note features as well. So it's a very quick, very simple, elegant sheet music maker where you can like quickly within 10 minutes create a sheet. So this is what you have to work with for now. If you have any questions, you can ask me."*

Earlier the same session: *"you have the project?"* (a question, answered).

**What the PDF is (measured, `pdfinfo` + rendered pages):** MuseScore Studio 4.7.5, 3 letter pages,
73 bars. Title "Khwabon ke Parindey", source "ZNMD" top right. Treble 8vb, B major (5♯), 4/4, ♩=90.
Section labels ("Intro:", "Chorus:", "Verse 1:" …, 10 sections) above the system's left edge; bar
number at each system start; mostly 4 bars a system, some 2. Boxed text above the staff ("Vocal 1
Enters", "Harmony on “Oho”") and plain text below it ("Band Enters - Vocal 1, Shakers, Bass, Ele
Guitar Strums"). Chord symbols C♯min11, D♯m+, G♯m7♯9, F♯7sus2, Emaj9; one or two per bar. Rhythm
is slashes in three kinds: a recurring strum (eighths and 16th rests, beamed); half-note slashes
(one per chord); and a "Choke" ending bar. Repeats on four sections, the last marked "4x". No
voltas or coda in this chart, but he asked for them.

**Inference, marked as inference:**
- His "F sharp → A" was an example. The chart is in B. Transposing respells every chord into the new
  key (non-negotiable 2), and the key signature moves with it.
- "Rhythm is notated" = slash notation with reusable bar patterns, as in the PDF. Not notes.
- "Text boxes wherever the space is" = every bar has an above-staff and a below-staff cue slot,
  ready to type into.
- Output on screen plus print/PDF. No playback.
- Standalone in this repo (Vite), until he says learnMusicIn.

**Why:** His instruction. It fills §0.

**Open:** Asked in the same session: where it ships, the chord menu's shape, the rhythm entry and
the output format. Answers go in the next decision.

---

## 2026-10-22 — Claude — decision 3: chords typed + palette, pattern stamps, standalone, print/PDF

**Type:** decision
**Files:** `AGENTS.md` §0 (items 2, 3, 7 re-marked)
**Did:** Omkar first rejected the question prompt, which stopped the turn, and then said, verbatim:

> *"im back"*

The same four questions were put again. He picked the recommended option on every one. These are
his answers as recorded by the question tool:

> *"How should chords be entered?"="Type + palette (Recommended)", "How should the rhythm be set for each bar?"="Pattern stamps (Recommended)", "Where does this ship?"="Standalone (Recommended)", "What do you hand the band?"="Print / PDF (Recommended)"*

- **Chords:** click a bar and type (e.g. `c#m11`), or click from a palette. The palette shows the
  key's diatonic chords, the chord qualities and the chords used recently. Each chord is stored
  relative to the key, so transposing is exact.
- **Rhythm:** a few named patterns per song (his strum, half-note slashes, four slashes, choke).
  One pattern is set per section, and single bars can be overridden.
- **Ships:** standalone, in this repo. It can be vendored into learnMusicIn later.
- **Output:** print/PDF in letter-size pages like the MuseScore chart. No MusicXML.

**Inference, marked as inference:** The first rejection was him stepping away, not a no. He came
back and answered the same questions. Picking the recommendation does not make the rest of the
option text a ruling: "letter-size", the palette's three rows and the four starter patterns are my
wording.

**Why:** His instruction.

**Open:** Look and feel beyond "exactly like a traditional chart". Notation font. Whether one chart
or many are kept (a song list).

---

## 2026-10-22 — Claude — work: the chart maker — first build, to decisions 2–3

**Type:** work
**Files:** `src/core/{ticks,pitch,chord,rhythm,song,khwabon}.ts`, `src/core/core.test.ts`,
`src/ui/engrave/{metrics,layout,Notation,measure}.ts(x)`, `src/ui/engrave/layout.test.ts`,
`src/ui/{Sheet,ChordPalette,Inspector,TopBar,store}.ts(x)`, `src/App.tsx`, `src/main.tsx`,
`src/styles.css`, `package.json` (+ `@vexflow-fonts/leland`, `@vexflow-fonts/edwin`, both OFL),
`skills/user-scenarios/chart-editor.md`, `AGENTS.md` §6 (amended), `CLAUDE.md` (map), `NEXT.md`
**Did:**
- **Chords are stored key-relative** (letter steps + semitones above the tonic). Transposing is
  setting the key: lossless, and spelled by letter (B → F♯ turns A♯m7♯9 into E♯m7♯9, never F).
  "Set key" re-reads the chords instead, for a key set wrong before typing.
- **Rhythm is pattern stamps.** His Strum and Choke were read off a 400-dpi render of bars 1 and 22,
  and both sum to 16 sixteenths. Slashes (one hollow slash per chord) and Beats are built in. A
  pattern that doesn't sum to the bar is refused with the shortfall shown. A bar whose pattern
  stops fitting after a meter change draws Beats.
- **Our own SVG engraver, no notation library** (AGENTS.md §6 amended, with the reason). The
  geometry is measured off his PDF: spatium 4.96 pt, 42.5 pt margins, a 24.8 pt first-system
  indent, the chord baseline and cue offsets. Glyphs are Leland and text is Edwin, MuseScore 4's own
  fonts. Leland has no slash noteheads, so slashes are paths. Beaming follows Gould (half bars in
  4/4), with one inference, matched to the PDF: a boundary breaks a beam only where a note starts
  on it.
- **The page is the editor.** Click a bar to open its chord box. Enter or Tab goes on to the next
  bar. `%` repeats and `.` holds. Cue slots show dashed on hover and across the selected system,
  never in print. The palette under the chord box offers the song's chords by use, the key's
  diatonic chords, and qualities. The inspector holds the bar (rhythm override, |: :| ×N, endings
  1–4, segno/coda, jumps, insert/delete) and the section (rhythm, reorder, duplicate, delete, add).
- **Saving:** every committed edit goes to localStorage at once. Unreadable saved data is backed up
  under a timestamped key before anything is written. Undo is a stack of Song values, held in
  memory.
- First run opens his *Khwabon ke Parindey*, transcribed bar by bar (73 bars, every cue verbatim).

**Verified:**

```
npm run check
EXIT=0 — verify-repo 5 checks passed, 39 tests in 3 files, tsc -b clean
```

- The four-bar test was proven by toggling: it fails on the old spacing constants (1 failed / 10)
  and passes on the new ones.
- Pane, port 5194, his chart: 3 pages, as in the PDF. At 2.2× zoom the clef, five sharps, 4/4,
  tempo, repeat signs, beams and rests were compared by eye against the PDF crops. No console
  errors.
- Driven, with state read from localStorage after each step:
  - Chord box: `e9 g#m7` Tab, `%` Enter, `A B C` Enter → bars 2 and 3 stored, bar 4 refused with
    "3 slots don't divide the bar".
  - ⌘Z ×2 and ⇧⌘Z gave the right states.
  - Transpose B → A redrew everything with 3 sharps, and Verse 1 broke 6 + 4 as in the PDF.
  - Cues above bars 24–25 in a system with no cue row were both stored. The first version lost
    one; see the scenarios file.
  - Ending 1 + :| on bar 26, + After, then ending 2 → both brackets drawn.
  - Duplicate a section, add a Pre-Chorus, type two bars, reload → all persisted.
  - A pattern typed a 16th short showed "short 1/16" and did not change the chart.
  - 3/4 → Strum and Choke bars fall back to beats.
- 900-px window: the page stays 887 px, the scroller scrolls, and the document doesn't overflow.
- Print: the print rules applied on screen gave 3 pages at 816×1056 px (8.5×11 in) with the top bar,
  inspector and edit layer hidden. Screenshot. A real print dialog was not opened.

**Open:** Everything in `NEXT.md`. Systems are not spread vertically as MuseScore does, so the
pages differ from the PDF's. Undo is lost on reload. Print has not been through a real dialog.
There is no file export. He has not seen any of it.

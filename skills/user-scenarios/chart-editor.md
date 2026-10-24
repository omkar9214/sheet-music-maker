# Chart editor — scenarios

The feature is §0 entire: a band chart in about 10 minutes. These are the scenarios walked before
building, answered by decision. The reference is `docs/reference/Khwabon ke Parindey.pdf`.

Extra users particular to this product: **the transcriber**, who already has the song in their
head or on paper and is copying it in at speed; **the arranger**, who changes things in rehearsal;
**the band reader**, who only ever sees the printout.

## Sharing, harmony, written notes — decisions 7–8 (2026-10-24)

The research behind this is in `docs/research/chart-apps.md`. Extra users here: **the bandmate**,
who receives a chart and may only have a phone. **The horn player**, who reads a transposed part.
**The arranger**, who writes the one riff that has to be exact.

### Sharing
- **Bandleader · sends a chart** → Charts ▾ → "Copy link". The chart rides in the link itself,
  with no account and no server. [built]
- **Bandmate · opens the link** → the app opens on a copy of that chart, added to their list.
  Opening the same link twice gives two copies, never an overwrite of a chart they edited.
  [built]
- **· a damaged link** → the app opens as normal and says "Couldn't read that link". Nothing is
  lost. [built]
- **Any · backup / another computer** → "Export file" writes `Title.chart.json`. "Import" or
  dropping the file on the window adds it. Exporting and importing back gives an identical chart
  (non-negotiable 5). [built, tested]
- **· a file from another app** → ChordPro (`.cho`, `.chopro`, `.chordpro`, `.txt`) imports grids
  bar for bar. Lyric-style ChordPro imports one bar per chord. [built]
- **· someone uses OnSong / SongbookPro** → "Export ChordPro". Chords, sections, repeats and
  endings are kept. Cues become comments. Rhythms and notes are not carried, and that is said in
  the file's header comment. [built]
- **· someone uses MuseScore / Sibelius / Dorico** → "Export MusicXML": chords, slash rhythm, notes,
  repeats, endings, key, meter and tempo changes, and cues as text. [built]
- **· wrong file** (an image, a corrupt JSON) → "Couldn't import <name>". The library is unchanged.
  [built]

### Harmony
- **Arranger · last chorus up a step** → select its first bar → Key change → pick D (from C). A
  double bar and the new signature are drawn, and everything after reads in D until the next
  change. [built]
- **· transposes the song with a key change in it** → the change keeps its interval: C→D up a
  step becomes A→B. [built, tested]
- **· key change to a key with too many accidentals after transposing** (C♯ up a major 3rd is E♯)
  → it is written as F, the enharmonic key with at most 7 accidentals, and its chords are spelled
  in F. [built, tested]
- **· changes back to the home key** → key change to the home key, and the cancelling naturals
  are drawn when the new key has fewer accidentals. [built]
- **· a 2/4 bar in a 4/4 song** → select it, then Time 2/4. The meter applies to the selected bars
  only, and the bar after goes back by itself (`setTimeForBars`). A whole 3/4 bridge is selected and
  set the same way. Patterns that don't fit draw beats. [built, tested]
- **· tempo change** → Tempo on that bar, drawn as ♩ = n above. [built]
- **· a push on the "and" of 4** → ½ in the chord boxes splits each beat into two. [built]
- **Session player · wants numbers** → Chords: A / 1 / I in the top bar. The chart shows Nashville
  numbers or Roman numerals from the same data, and prints that way. [built]
- **Horn player · needs a B♭ part** → Part: B♭. The whole chart, chords and notes alike, is shown
  and printed up a major 2nd. Editing is still possible, and what is typed is read in the part's
  key. [built]
- **Guitarist · capo 2** → Part: Capo 2. The shapes are shown down 2 semitones. [built]

### Written notes (decision 8) — removed from the editor in decision 9

Omkar, decision 9: *"Remove the notes feature for now, It's getting complicated"*. The rows below
describe what was built and taken out. A chart that already holds notes still shows them.
- **Arranger · writes a riff in bar 9** → select bar 9 → Notes (left sidebar, bottom) → the bar
  becomes a whole rest with a cursor. Press a digit for the length (1 whole, 2 half, 3 quarter, 4
  8th, 5 16th), then a letter A–G. The note lands at the cursor, which moves on. [built]
- **· which octave?** → the nearest to the previous note. The first note of a bar goes nearest the
  middle of the staff. ⌘↑/⌘↓ moves an octave. [built]
- **· sharps and flats** → a typed letter takes the key signature's accidental (C in B major is C♯).
  ↑/↓ moves a semitone, and ♯ ♭ ♮ on the palette set one. Accidentals carry through the bar, as
  in print. [built]
- **· a chord of notes** → Shift+letter adds a note above to the same chord. [built]
- **· rest / dot / tie** → 0 (or the rest button) for a rest, `.` for a dot, `T` to tie to the
  next note. [built]
- **· mistake** → ⌫ turns the last note back into rest. ⌘Z undoes. [built]
- **· runs past the bar** → the note is cut at the barline. The cursor then moves to the next bar,
  which becomes a notes bar when its first note goes in. [built]
- **· back to slashes** → Slashes on the palette. The notes are dropped, and ⌘Z brings them back.
  [built]
- **· transposes / part view** → notes move with the key, by the nearest octave, and are spelled
  in the new key. [built, tested]

## Chords on beats, rhythm by clicking — decision 6 (2026-10-23)

He said: *"Need to be able to change the rhythm, and chord adding logic is weird."* The weirdness
was invisible arithmetic: the number of typed tokens decided the beats (`A . . E`), and beat 2 alone
was impossible. Rhythm was a fixed stamp, or a duration string typed in a hidden popover.

The design: **the bar's beats are boxes.** Chords go into beat cells (1 2 3 4), and the strum is a
row of 16th-note steps under the same beats, counted "1 e & a". This borrows iReal Pro's four spaces
per bar, Dorico's Space-to-next-beat, and a drum machine's step grid. The chord cells pop up at the
bar being edited. The rhythm grid lives in the inspector, because it applies to the whole selection.

Extra users here: **the strummer**, who thinks in "down down up" and counts "1 & 2 &", not in note
values. **The reader**, who must get standard notation however the grid was clicked.

### Chord entry
- **Transcriber · one chord per bar** → type `b`, and the cells open on the bar with beat 1 holding
  "b". Type `maj7`, then Enter, and the next bar opens on beat 1. [built]
- **· two chords, beats 1 and 3** → `Bmaj7`, Space, Space, `C#m11`, Enter. Space moves one beat,
  and the cell under the cursor is outlined. [built]
- **· chord on beat 4 only, or beat 2 only** → Space to that cell and type. An empty first beat is
  allowed: the previous bar's chord carries on, as in iReal Pro. [built]
- **· back a beat** → Shift+Space, or ⌫ in an empty cell. ←/→ at the edge of a cell's text also
  move. [built]
- **· mouse user** → click a cell to put the cursor there. Suggestions drop under the active cell,
  and clicking one fills it. [built]
- **· edits a bar that already has chords** → Enter or double-click opens the cells with them in
  place, the active one selected. Typing a letter over a selected bar replaces its chords, as a
  spreadsheet cell does. [built]
- **· typo in beat 3** → that cell turns red, the bar is not stored, and the cursor goes to the
  cell. The other cells keep what was typed. [built]
- **· `%` in beat 1, the rest empty** → copies the previous bar. [built]
- **· changes his mind** → Esc leaves the bar as it was. [built]
- **· 6/8 or 3/4** → 2 or 3 cells: as many as the meter has beats. [built]
- **· a chord on the "and"** → not on beat cells. A bar already holding one (from old data) opens with
  8th-note cells so nothing is hidden. [built; open: whether he needs pushes]
- **· a bar whose chords start on beat 2, rhythm Slashes** → the first slash covers beat 1 with no
  chord over it. Nothing is lost or drawn wrong. [built]

### Rhythm
- **Strummer · sees the strum** → the inspector shows the selected bar's rhythm as 16 steps under
  "1 e & a 2 e & a …". ▮ is a strum, ━ lets it ring, and · is silence. [built]
- **· changes one strum** → click a step: ring → strum → silence → ring. The bar on the page
  redraws at once, and each click is one undo step. [built]
- **· changes the strum for one bar only** → select that bar and click. Only that bar changes (its
  own rhythm). The chips show none of the named patterns as on, and "Custom" is shown. [built]
- **· wants that new strum elsewhere** → "Save as pattern" names it. It becomes a chip, and the
  bars it came from use it. [built]
- **· changes the strum for the whole chorus** → click the section in Form (all its bars are
  selected), then click steps. Every selected bar gets the rhythm. [built]
- **· changes "Strum" everywhere it is used** → the Patterns menu shows each pattern as the same
  grid. Editing there changes every bar that uses it. [built]
- **· goes back to the pattern** → click the pattern's chip. The bar's own rhythm is dropped. [built]
- **· selection with mixed rhythms** → the grid shows the focus bar's rhythm, and the chip row shows
  none as on. A click applies the result to all selected bars. [built]
- **· clicks steps that make an odd length** (a strum that rings 5 sixteenths) → it is notated
  as a tied pair (quarter tied to 16th), never as an impossible value. The tie is drawn. [built]
- **· all silence** → a whole-bar rest. [built]
- **· starts the bar silent** → the steps before the first strum are rests. [built]
- **Reader · rests** → rests are split at the beats, except a whole-bar rest and half rests on beats 1 or 3 in 4/4. This
  is the convention as remembered from Gould's *Behind Bars* on rests, not checked against the
  book. [built]
- **· his Strum, re-clicked to the same shape** → the notation is identical to his PDF:
  `8 8 r16 8 8 8 r16 4`. [built, tested]
- **· his Choke edited** → its rests renotate by the beat rule as r16 r8 r4. The PDF has r8 r16 r4,
  which is MuseScore's spelling, not the textbook one. [built; noted]
- **· Slashes bar clicked in the grid** → the grid starts from what the bar draws (one long note
  per chord), and the bar becomes its own rhythm. [built]
- **· 6/8, 3/4, 12/8** → 12, 12 and 24 steps, grouped by beat. 12/8 wraps to two rows. [built]

## Redesign — decision 5 (2026-10-23)

He found the first editor clunky: *"clicking the bar opens chords and chord area also opens
chords"*. The rows below marked **[superseded]** described the first design. They are kept so its
reasoning can still be read. Borrowed from iReal Pro (one cursor on a measure, type the chord,
Return moves on, selection-scoped barline/ending controls), Dorico/MuseScore (chord entry stays
open and advances), and spreadsheets (click selects, typing replaces, Enter edits).

- **Any · clicks a bar** → selects it, and nothing opens. Shift-click or ⇧←/→ extends to a range,
  and ↑/↓ moves between systems. [built]
- **Transcriber · enters chords** → with a bar selected, type the chord letter and the box opens
  holding it. Enter/Tab stores the bar and opens the next one, and Esc stops. A short list of
  suggestions narrows as you type: the song's chords by use, then the key's, then common
  qualities. ↓ then Enter takes one. [built]
- **· edits an existing bar** → Enter or double-click on the chord row opens it with its text
  selected. [built]
- **· same four bars again** → select them, ⌘C, then select the target and ⌘V. Chords, rhythm and
  cues are pasted; repeat signs and endings are not, because they belong to the form. [built]
- **· clears bars** → ⌫ clears the chords of the selection. [built]
- **Arranger · repeats a passage** → select the bars, then press "|: 9–12 :|" once, and ×N
  appears. [built]
- **· 1st/2nd endings** → select the bars, then press 1. or 2. [built]
- **· a whole section's rhythm** → click the section in Form to select all its bars, then pick the
  rhythm. That sets the section's own rhythm, with no per-bar overrides. [built]
- **· cues** → the Above/Below fields in the inspector for the selected bar. Double-clicking above
  or below a bar on the page goes straight to that field. [built]
- **· form** → the Form panel lists sections with their first bar number and bar count (− +).
  Double-click renames; ↑ ↓ ⧉ × show on the row in use. "+ Verse" etc. add after the selected
  section and open entry in its first bar. [built]

## Start

- **First time · opens the app** — what is this, where do I type?
  → The app opens on a chart. On the very first run that is his *Khwabon ke Parindey*, so there is a
  real example to read. "New chart" is one press. A new chart has a title, a key of C, 4/4, ♩=90 and
  an "Intro" of 4 empty bars. [built]
- **Transcriber · new chart** — they want to set the title, source, key and tempo.
  → Title and source are typed straight onto the page. Key, tempo and time are in the top bar. [built]
- **Transcriber · enters chords before setting the key** — they type chords in the default C, then
  realise the song is in B.
  → The key menu has two actions. **Transpose to** moves the chords. **Set key** keeps every chord
  as written and only re-reads it in the new key. If a chart has no chords yet, both do the
  same. [built]

## Chords (step 3)

- **[superseded]** **Transcriber · chord per bar, many bars** — the main loop.
  → Click a bar and type `bmaj7`. Enter, or Tab, commits and moves to the next bar's chord box, and
  Shift+Tab moves back. Esc closes the box. 73 bars at about 4 s each is about 5 minutes. [built]
- **· two chords in a bar** → `Bmaj7 C#m11` splits the bar evenly: beats 1 and 3 in 4/4. [built]
- **· chord on beat 4 only** → `.` holds a beat, so `Bmaj7 . . E` puts E on beat 4. [built]
- **· same as last bar** → `%` copies the previous bar's chords. [built]
- **· no chord** → `NC` gives N.C. An empty box clears the bar. [built]
- **· sloppy typing** → `c#m11`, `C#min11`, `C♯m11`, `bb7`, `Bb/D` are all accepted. A lowercase
  root is fine. `b` after a letter is a flat, so `bb7` is B♭7. A `#`/`b` in the quality becomes
  ♯/♭. [built]
- **· typo / impossible chord** (`H7`, `C#m/Q`) → the box shows a red edge and refuses to commit.
  The bar keeps its old chords. Nothing is lost. [built]
- **[superseded]** **· doesn't know what to type** → the palette under the box. "In this song" lists the chords
  already used, most used first. This is the fastest path once a song's 5–6 chords exist. "Key"
  lists the diatonic chords. "Quality" chips append to the current chord. Clicking a chip does not
  close the box. [built]
- **· 3 chords in 4/4** → 3 tokens do not divide 4 beats, so the box refuses to commit and shows
  red. Use `.`: `A . B C`. [built]

## Transpose (step 7, his core reason)

- **Arranger · F♯ → A** → everything moves: chords, slash basses, key signature. Spelling follows
  the new key: in A, the ♭VII of B major (A) becomes G, and the III♯ of B (D♯) becomes C♯. No chord
  is ever respelled enharmonically (non-negotiable 2). [built, tested on every chord in the PDF]
- **· transposes there and back** → B → A → B is identical. It is lossless because chords are
  stored relative to the key. [built, tested]
- **· a key with double sharps** → B major's A♯m7♯9 in C♯ major is B♯m7♯9. That is correct
  spelling, shown as-is. [built]
- **· minor song** → the minor keys are in the same menu. The signature is its relative
  major's. [built]

## Rhythm (step 4)

- **Transcriber · whole section strums the same** → the section's pattern is one click in the
  inspector, and every bar without its own override follows it. [built]
- **· one bar differs** (the choke) → select the bar and pick a pattern. The bar shows it as an
  override, and "Section" resets it. [built]
- **· own strum** → "Patterns" in the top bar. Type durations, e.g. `8 8 r16 8 8 8 r16 4`. If it
  does not sum to the bar it is refused with the shortfall shown, e.g. "short 1/16" (non-negotiable
  1). [built]
- **· "just slashes for the chords"** → the built-in **Slashes** pattern: one hollow slash per chord,
  as bars 13–16 of the PDF. [built]
- **· changes time signature with custom patterns** → a pattern that no longer fits is shown as not
  fitting in the patterns list. Bars using it draw beat slashes, never an overfull bar. [built]

## Cues (step 5)

- **[superseded]** **Transcriber · lots of cues** → every bar has a box above (boxed, like "Vocal 1 Enters") and a
  line below (plain, like "Band Enters…"). They show as faint dashed boxes on the selected system
  and on hover, never in print. Click and type. Enter commits, and Tab goes to the same slot in the
  next bar. [built]
- **· long cue** → it runs on into the next bars' space, as in the PDF. A system with any cue
  above gets a cue row, and one without doesn't, so empty space is not printed. [built]
- **· two cues in one bar, both above** → not MVP. One above and one below covers every bar of the
  PDF. [open: wait until he hits it]
- **· Escape in a chord box** → cancels: the bar keeps what it had. Enter, Tab or clicking away
  keeps what was typed. [built]

## Structure (steps 2, 6)

- **Transcriber · next section** → "+ Section" offers chips: Intro, Verse, Pre-Chorus, Chorus, Bridge,
  Solo, Interlude, Outro. A new section has 4 bars, and verses number themselves. [built]
- **· chorus again** → "Duplicate" copies a section with its chords, cues and repeats. The copy is
  edited, not retyped. [built]
- **· wrong bar count** → +/− bar in the inspector. Insert and delete happen at the selected
  bar. [built]
- **· repeats** → the inspector's repeat |: and :| toggles on the selected bar. "×N" is set on the
  :| bar. A count above 2 prints "N×" under the end barline, as "4x" in the PDF. [built]
- **· 1st / 2nd endings** → the ending chips 1–4 are multi-select, so `1, 2.` works. A bracket is
  drawn over consecutive bars with the same ending. [built]
- **· coda / D.S.** → the marker chips: Segno, Coda, To Coda, D.S. al Coda, D.C. al Coda, D.C. al
  Fine, Fine. [built]
- **· reorder sections** → ↑/↓ on the section in the inspector. [built]

## Never lose it (non-negotiable 4)

- **Clumsy · deletes a section** → Ctrl/⌘+Z. Every edit is one undo step. [built]
- **Clumsy · closes the tab mid-typing** → every committed edit is saved at once to this browser.
  Text still in an open box is committed when the box loses focus. [built]
- **· saved data is unreadable** (a future format, a corrupt write) → it is kept under a backup key,
  never overwritten, and the app starts with the reference chart. [built]
- **· undo after a reload** → not kept. The saved chart survives, but the undo history does
  not. [built — stated in WORKLOG]
- **Regular · many songs** → the "Charts" menu lists every chart. Open, new, duplicate and delete
  are there, and delete asks first. [built]

## Hand it over (step 8)

- **Band reader · printout** → Print (⌘P or the button) gives letter pages, the same pages as on
  screen, with no UI, dashed boxes or selection. The browser's "Save as PDF" makes the PDF. [built]
- **· long song** → pages break between systems, never through one. Pages 2+ carry a page number,
  as in the PDF. [built]

## Small screen (non-negotiable 7)

- **Any · narrow window** → the page keeps its size and the window scrolls. It is never scaled
  below legibility. [built]

## What walking it found

Decisions 7–8:

- **A meter change ran to the end of the song.** Setting bar 4 to 2/4 left the whole chart in 2/4.
  A meter now applies to the selection, and the next bar goes back. Test: the exchange fixture uses
  `setTimeForBars`, and ChordPro carries the `{time: 4/4}` back.
- **An unlabeled ChordPro grid became "Section 2".** The exporter splits a section at a key or meter
  change, and the importer now continues the section. Test: his chart round-trips its section names.
- **`{title: X}` lost its value** to a lazy regex. Rewritten. Test: the title round-trips.
- **The key-change picker was clipped** by the inspector's scroll box. It now opens in place, sized
  to the panel (measured: right edge 1453 ≤ 1482).
- **A tie into the next bar was neither drawn nor exported.** It is now drawn to the barline, and
  MusicXML stops it on the next bar's first note. Test proven by toggling: 1 failed without, 9 passed
  with.
- **A test passed for the wrong reason**: the "unwritable key" case stored F directly. Rewritten to
  build D♯ (→ E♭) and E♯ (→ F) for real.

Decision 6:

- **A typed first letter was overwritten.** `e` then `maj9` gave "maj9": React runs effects twice in
  development, and a ref flipped inside the focus effect made the second run select the letter. The
  caret rule is now state, so the effect is idempotent.
- **"16 8." was split and tied** although it sits inside one beat. A writable value inside one beat
  now stays single. Test: "a strum ringing 5 sixteenths is written tied" now also covers the dotted
  8th on the "e".
- **Two test expectations were wrong, not the code.** A quarter on the "&" of 2 crosses the middle of
  a 4/4 bar, and tying it is the textbook writing.

Decision 5's redesign:

- **The suggestion list opened under a resting pointer, and `mouseenter` stole the highlight.**
  ↓ Enter then took the second suggestion. Now on `mousemove`.
- **A spent focus request re-focused the Below field** every time a single bar was selected again,
  so ⌘V and ⌫ typed into the field. Now one-shot.
- **⌘V carried only rhythm overrides**, so Melody's slashes pasted into the strummed Chorus came out
  strummed. Copy now carries the rhythm the bar draws. Test: "a pasted bar draws the rhythm it
  drew where it was copied".

Decision 3's build:

- **Spacing broke the Intro 3 + 1** where the PDF has 4. Spacing tightened (1.2+2.0·√ → 1.1+1.9·√).
  Test: "fits four strum bars on a system", proven to fail on the old constants.
- **`Bmaj7e9` was stored as a chord.** Typing into a box that still held "Bmaj7" appended to it, and
  any letters were accepted as a quality. Quality is now a closed vocabulary (`QUALITY` in
  `core/chord.ts`), and the box selects its text on open. Tests: "refuses typos", "accepts the
  qualities a chart uses".
- **A cue typed into a system with no cue row was lost.** The box was filled in one effect and
  focused in a later one, so keystrokes in between went nowhere. Each slot is now its own keyed input
  that mounts with its text and focuses in the same commit. Verified in the browser (Melody bars
  24–25), not by a unit test: the race lives in React's effect timing.
- **The palette hung 96 px past the scroller** at the last bar of a system. Clamped inside the page.
- **A meter change could push a chord past the bar's end** (beat 4 of 4/4 → 3/4). It is now moved to
  the last beat, still visible. Test: "a meter change keeps every chord visible inside its bar".

# Chart editor — scenarios

The feature is §0 entire: a band chart in about 10 minutes. These are the scenarios walked before
building, answered by decision. The reference is `docs/reference/Khwabon ke Parindey.pdf`.

Extra users particular to this product: **the transcriber**, who already has the song in their
head or on paper and is copying it in at speed; **the arranger**, who changes things in rehearsal;
**the band reader**, who only ever sees the printout.

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

- **Transcriber · chord per bar, many bars** — the main loop.
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
- **· doesn't know what to type** → the palette under the box. "In this song" lists the chords
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

- **Transcriber · lots of cues** → every bar has a box above (boxed, like "Vocal 1 Enters") and a
  line below (plain, like "Band Enters…"). They show as faint dashed boxes on the selected system
  and on hover, never in print. Click and type. Enter commits, and Tab goes to the same slot in the
  next bar. [built]
- **· long cue** → it runs on into the next bars' space, as in the PDF. A system with any cue
  above gets a cue row, and one without doesn't, so empty space is not printed. [built]
- **· two cues in one bar, both above** → not MVP. One above and one below covers every bar of the
  PDF. [open: wait until he hits it]

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

(filled in during verification)

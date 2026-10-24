# What other chart apps do — research for decision 7 (2026-10-24)

Omkar, decision 7: *"Do your research … check out all kinds of apps and then add features, use
simplicity and ease of use foremost and do things that makes sense"*. Sources were read on
2026-10-22/24. What each feature turned into here is in the last column.

| App / format | What it does that matters to a band chart | Taken? |
|---|---|---|
| **iReal Pro** ([edit a song](https://www.irealpro.com/learn/edit-a-song)) | Four spaces per bar for chords. Type root + quality. `%` repeats a bar. Barline, ending, coda and segno buttons act on the selection. Standard texts ("D.C. al Coda", "3x"). | Already in (decisions 5–6). |
| **Dorico** ([chord popover](https://www.steinberg.help/r/dorico-pro/5.1/en/dorico/topics/write_mode/write_mode_notations_input/write_mode_chord_symbols_inputting_t.html)) | Chord popover stays open. Space goes to the next beat, Tab to the next bar. | Already in (decision 6). |
| **MuseScore** ([note input](https://musescore.org/en/handbook-basics/note-input), [keyboard shortcuts](https://musescore.org/en/handbook/keyboard-shortcuts)) | Note input: letters A–G for pitch, digits for duration, `.` dot, `0` rest. Shift+letter adds to a chord. | **Yes** — note entry (decision 8) uses these keys. The digit map is ours (1 = whole … 5 = 16th, as written on the palette). Theirs varies by version. |
| **OnSong** ([chord display](https://onsongapp.com/docs/2023/interface/menubar/style-preferences-menu/chords), [transpose](https://www.onsongapp.com/docs/transpose)) | Chords can show as letters, **Nashville numbers**, Roman numerals or solfège. A **capo** setting changes the chord shapes without changing the key (0–11). | **Yes**: a chord display of Letters / Numbers / Roman, plus a capo. Solfège was not taken. |
| **ChordPro 6** ([grid](https://chordpro.org/beta/directives-env_grid/), [cheat sheet](https://chordpro.org/beta/chordpro-cheat_sheet/)) | The interchange text format of OnSong, SongbookPro, MobileSheets and others. `{start_of_grid}` holds bars: `| C . G . |`, with `|:` `:|` `|1` `|2` `||` `|.`, `.` for a held beat, `%` for a repeated bar, and `{title}` `{key}` `{tempo}` `{time}`. | **Yes**: import and export, grid sections. Lyric-style ChordPro imports best-effort, one bar per chord. |
| **MusicXML** ([slash](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slash), [measure-style](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-style)) | Open format for MuseScore, Sibelius, Dorico and Finale. Slash notation, `<harmony>` chord symbols, repeats, endings, directions. | **Export only** (decision 8). Slash bars are written as slash noteheads. |
| **MultiTracks ChartBuilder**, **1Chart**, **JotChord**, **Nashville Numbers** (App Store listings) | A song map beside the chart, music-director notes, letters ↔ numbers, whole-chart transpose, PDF for players who don't read numbers. | Song map = the Form panel (decision 5). Letters ↔ numbers: taken. PDF: in. |
| **Transposing instruments** (common to iReal, MuseScore, Sibelius) | Parts for B♭ (trumpet, tenor sax), E♭ (alto sax) and F (horn), written up a major 2nd, major 6th and perfect 5th. | **Yes**: a "Part" view of Concert / B♭ / E♭ / F / Capo, which prints as shown. |

**Sharing with people** (decision 7, "working with people"), with no backend (AGENTS.md §6):
- A chart file (`.chart.json`), lossless, for import/export, plus drag-and-drop onto the window.
- A **share link** with the chart compressed into the URL fragment. It never reaches a server, and
  opening it imports a copy.
- ChordPro for other chart apps, MusicXML for notation apps, PDF for everyone else.

**Harmony inside a song** (decision 7, "key changes etc"):
- A key change at any bar, which transposes with the song. Transposing the chart keeps the
  modulation's interval, so a chorus a step up stays a step up.
- Meter and tempo changes at any bar.
- Chords between beats ("pushes"), with 8th-note cells.

**Not taken**, and why:
- Setlists, auto-scroll, foot pedals and performance mode: stage tools, not a chart maker's loop
  (§0).
- Solfège: nobody asked.
- iReal Pro's `irealb://` format: a private format. ChordPro covers the interchange.

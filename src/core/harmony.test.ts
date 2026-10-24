import { describe, expect, it } from "vitest";
import { chordLabel, chordText, parseChord } from "./chord";
import { barContexts } from "./context";
import { khwabon } from "./khwabon";
import { nearestOctave, pitchOf, restBar, shiftSemitone, shownAccidentals, writeAt, writtenOf, type Written } from "./notes";
import { partKey, partSong } from "./part";
import { KEYS, keyName, readSpelled, type Key } from "./pitch";
import { setBarNotes, setKeyChange, setKeyKeepChords, setTimeChange, transpose, type Song } from "./song";
import { PPQ } from "./ticks";

const key = (name: string, mode: "major" | "minor" = "major"): Key => {
  const s = readSpelled(name)!.spelled;
  return KEYS.find((k) => k.mode === mode && k.tonic.letter === s.letter && k.tonic.acc === s.acc)!;
};
const T44 = { beats: 4, unit: 4 as const };
const name = (w: Written) => "CDEFGAB"[w.letter]! + ["𝄫", "♭", "", "♯", "𝄪"][w.acc + 2]! + w.octave;

/** His chart with the Outro (bar 70) a whole step up: the "last chorus up a step" case. */
function lifted(): { song: Song; outro: string } {
  const song = khwabon();
  const outro = song.sections.at(-1)!.bars[0]!.id;
  return { song: setKeyChange(song, outro, key("C#")), outro };
}

describe("key changes — decision 7", () => {
  it("a key change is in force from its bar to the next change", () => {
    const { song, outro } = lifted();
    const ctx = barContexts(song);
    expect(keyName(ctx.get(outro)!.key)).toBe("C♯");
    expect(ctx.get(outro)!.keyChanged).toBe(true);
    const before = song.sections.at(-2)!.bars.at(-1)!.id;
    expect(keyName(ctx.get(before)!.key)).toBe("B");
  });

  it("chords after the change read in the new key: Bmaj7's degree in C♯ is C♯maj7", () => {
    const { song, outro } = lifted();
    const bar = song.sections.at(-1)!.bars[0]!;
    expect(chordText(bar.chords[0]!.chord!, barContexts(song).get(outro)!.key)).toBe("C♯maj7");
  });

  it("transposing the song keeps the change's interval: B→A makes the up-a-step key B", () => {
    const { song, outro } = lifted();
    const t = transpose(song, key("A"));
    expect(keyName(barContexts(t).get(outro)!.key)).toBe("B");
  });

  it("a change landing on an unwritable key is respelled: B +M3 is D♯; in C♯ that is E♯ → F", () => {
    const song = khwabon();
    const bar = song.sections[1]!.bars[0]!.id;
    // D♯ major (9 sharps) is not on the menu, so the change is made as written in B's terms: +M3 by
    // letter is two letters, four semitones. Built directly to test the respelling, not the menu.
    const s1: Song = { ...song, sections: song.sections.map((x, i) => (i !== 1 ? x : { ...x, bars: x.bars.map((b, j) => (j === 0 ? { ...b, keyChange: { degree: { steps: 2, semis: 4 }, mode: "major" as const } } : b)) })) };
    expect(keyName(barContexts(s1).get(bar)!.key)).toBe("E♭"); // B + M3 = D♯ (9 sharps) → E♭
    const s2 = transpose(s1, key("C#"));
    expect(keyName(barContexts(s2).get(bar)!.key)).toBe("F"); // C♯ + M3 = E♯ (11 sharps) → F
    expect(chordText(s2.sections[1]!.bars[0]!.chords[0]!.chord!, barContexts(s2).get(bar)!.key)).toBe("Fmaj7");
    // Back home, nothing drifted: the change is D♯ again, written E♭.
    expect(keyName(barContexts(transpose(s2, key("B"))).get(bar)!.key)).toBe("E♭");
  });

  it("Set key keeps every sounding chord and the key change's absolute key", () => {
    const { song, outro } = lifted();
    const s2 = setKeyKeepChords(song, key("A"));
    const c1 = barContexts(s2);
    expect(keyName(c1.get(outro)!.key)).toBe("C♯");
    const intro = s2.sections[0]!.bars[0]!;
    expect(chordText(intro.chords[0]!.chord!, s2.key)).toBe("Bmaj7");
  });

  it("a meter change applies from its bar and fits the bar's chords and notes", () => {
    const song = khwabon();
    const id = song.sections[0]!.bars[1]!.id;
    const s2 = setTimeChange(song, id, { beats: 2, unit: 4 });
    const ctx = barContexts(s2);
    expect(ctx.get(id)!.time).toEqual({ beats: 2, unit: 4 });
    expect(ctx.get(song.sections[0]!.bars[0]!.id)!.time).toEqual(T44);
  });
});

describe("chord views — decision 7", () => {
  const B = key("B");
  const c = (t: string) => parseChord(t, B)!;
  it("numbers and Roman from the same chords", () => {
    expect(["Bmaj7", "C#min11", "D#m+", "Emaj9", "F#7sus2", "Amaj7", "G#m7#9"].map((t) => chordLabel(c(t), B, "numbers")))
      .toEqual(["1maj7", "2min11", "3m+", "4maj9", "57sus2", "♭7maj7", "6m7♯9"]);
    expect(["Bmaj7", "C#min11", "D#m+", "Amaj7", "A#ø7", "B/D#"].map((t) => chordLabel(c(t), B, "roman")))
      .toEqual(["Imaj7", "ii11", "iii+", "♭VIImaj7", "viiø7", "I/III"]);
  });
});

describe("parts — decision 7", () => {
  it("instruments read by letter; a capo reads the simplest key", () => {
    expect(keyName(partKey(key("Bb"), "bb"))).toBe("C");
    expect(keyName(partKey(key("C"), "eb"))).toBe("A");
    expect(keyName(partKey(key("C"), "f"))).toBe("G");
    expect(keyName(partKey(key("B"), "capo2"))).toBe("A");
    expect(keyName(partKey(key("C#"), "capo1"))).toBe("C");
  });

  it("a part moves written notes up its interval, not to the nearer octave", () => {
    let song = transpose(khwabon(), key("C"));
    const id = song.sections[0]!.bars[0]!.id;
    const ctx = barContexts(song).get(id)!;
    const c4 = pitchOf({ letter: 0, acc: 0, octave: 4 }, ctx);
    song = setBarNotes(song, id, writeAt(undefined, T44, 0, PPQ * 4, [c4]).runs);
    const alto = partSong(song, "eb");
    const w = writtenOf(alto.sections[0]!.bars[0]!.notes![0]!.pitches[0]!, barContexts(alto).get(id)!);
    expect(name(w)).toBe("A4");
  });
});

describe("written notes — decision 8", () => {
  it("writing at the cursor fills the rest of the bar with silence and sums to the bar", () => {
    const p = { steps: 0, semis: 0 };
    let r = writeAt(undefined, T44, 0, PPQ, [p]);
    expect(r.next).toBe(PPQ);
    r = writeAt(r.runs, T44, r.next, PPQ / 2, [p]);
    expect(r.runs.map((x) => [x.ticks, x.rest])).toEqual([[PPQ, false], [PPQ / 2, false], [PPQ * 2.5, true]]);
    expect(r.runs.reduce((a, x) => a + x.ticks, 0)).toBe(PPQ * 4);
  });

  it("a note over the middle of another cuts it, and a value past the barline is cut at it", () => {
    const p = { steps: 0, semis: 0 };
    const whole = writeAt(undefined, T44, 0, PPQ * 4, [p]).runs;
    const mid = writeAt(whole, T44, PPQ, PPQ, [{ steps: 1, semis: 2 }]);
    expect(mid.runs.map((x) => [x.ticks, x.rest])).toEqual([[PPQ, false], [PPQ, false], [PPQ * 2, true]]);
    const late = writeAt(undefined, T44, PPQ * 3, PPQ * 4, [p]);
    expect(late.next).toBe(PPQ * 4);
    expect(late.runs.reduce((a, x) => a + x.ticks, 0)).toBe(PPQ * 4);
  });

  it("typed letters take the key's accidental; accidentals carry through the bar", () => {
    const song = khwabon();
    const id = song.sections[0]!.bars[0]!.id;
    const ctx = barContexts(song).get(id)!;
    // C, C♮, C in B major: C♯ (no sign), C♮ (natural sign), C♮ again (carried, no sign)
    const cs = pitchOf({ letter: 0, acc: 1, octave: 5 }, ctx);
    const cn = pitchOf({ letter: 0, acc: 0, octave: 5 }, ctx);
    let runs = restBar(T44);
    runs = writeAt(runs, T44, 0, PPQ, [cs]).runs;
    runs = writeAt(runs, T44, PPQ, PPQ, [cn]).runs;
    runs = writeAt(runs, T44, PPQ * 2, PPQ, [cn]).runs;
    expect(shownAccidentals(runs, ctx).slice(0, 3)).toEqual([[null], [0], [null]]);
  });

  it("octave goes nearest the previous note; semitones respell toward the key", () => {
    expect(nearestOctave(1, { letter: 6, acc: 0, octave: 4 })).toBe(5); // D after B4 is D5
    expect(nearestOctave(4, { letter: 1, acc: 0, octave: 5 })).toBe(5); // G after D5 is G5, a 4th up
    expect(nearestOctave(5, { letter: 1, acc: 0, octave: 5 })).toBe(4); // A after D5 is A4, a 4th down
    const B = key("B");
    expect(name(shiftSemitone({ letter: 0, acc: 0, octave: 5 }, 1, B))).toBe("C♯5");
    expect(name(shiftSemitone({ letter: 0, acc: 0, octave: 5 }, -1, key("C")))).toBe("B4");
    expect(name(shiftSemitone({ letter: 3, acc: 0, octave: 4 }, 1, key("C")))).toBe("F♯4");
  });

  it("transposing moves notes to the nearer register, spelled by letter, and back exactly", () => {
    let song = khwabon();
    const id = song.sections[0]!.bars[0]!.id;
    const ctx = barContexts(song).get(id)!;
    const ds5 = pitchOf({ letter: 1, acc: 1, octave: 5 }, ctx);
    song = setBarNotes(song, id, writeAt(undefined, T44, 0, PPQ * 4, [ds5]).runs);
    const read = (s: Song) => name(writtenOf(s.sections[0]!.bars[0]!.notes![0]!.pitches[0]!, barContexts(s).get(id)!));
    expect(read(transpose(song, key("A")))).toBe("C♯5");
    expect(read(transpose(song, key("C#")))).toBe("E♯5");
    expect(read(transpose(song, key("F")))).toBe("A4");
    let round = song;
    for (const k of KEYS.filter((x) => x.mode === "major")) round = transpose(round, k);
    expect(read(transpose(round, key("B")))).toBe("D♯5");
  });
});

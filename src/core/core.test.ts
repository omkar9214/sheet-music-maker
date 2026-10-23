import { describe, expect, it } from "vitest";
import { barText, chordText, diatonicChords, parseBar, parseChord } from "./chord";
import { khwabon } from "./khwabon";
import { KEYS, fifths, keyName, readSpelled, type Key } from "./pitch";
import { barRhythm, beamGroups, parsePattern, starterPatterns } from "./rhythm";
import { allBars, barRange, copyBars, duplicateSection, pasteBars, setBarCount, setBarText, setKeyKeepChords, setRepeat, setTime, toggleEnding, transpose, updateSection, type Song } from "./song";
import { PPQ, barTicks } from "./ticks";

const key = (name: string, mode: "major" | "minor" = "major"): Key => {
  const s = readSpelled(name)!.spelled;
  return KEYS.find((k) => k.mode === mode && k.tonic.letter === s.letter && k.tonic.acc === s.acc)!;
};
const B = key("B");
const T44 = { beats: 4, unit: 4 as const };

/** Every chord symbol in the chart, in reading order, as text. */
function chordsOf(song: Song): string[] {
  return allBars(song).flatMap((x) => x.bar.chords.map((c) => (c.chord ? chordText(c.chord, song.key) : "N.C.")));
}

describe("keys", () => {
  it("has a signature for every key in the menu, and the circle is right", () => {
    expect(KEYS.map((k) => `${keyName(k)}:${fifths(k)}`).slice(0, 15).join(" ")).toBe(
      "C:0 G:1 D:2 A:3 E:4 B:5 F♯:6 C♯:7 F:-1 B♭:-2 E♭:-3 A♭:-4 D♭:-5 G♭:-6 C♭:-7",
    );
    expect(fifths(key("C#", "minor"))).toBe(4);
    expect(fifths(key("D", "minor"))).toBe(-1);
    expect(fifths(key("A#", "minor"))).toBe(7);
  });
});

describe("chords", () => {
  it("reads sloppy typing and spells it in the key", () => {
    const t = (s: string) => chordText(parseChord(s, B)!, B);
    expect(t("c#m11")).toBe("C♯m11");
    expect(t("C#min11")).toBe("C♯min11");
    expect(t("C♯min11")).toBe("C♯min11");
    expect(t("g#m7#9")).toBe("G♯m7♯9");
    expect(t("bb7")).toBe("B♭7");
    expect(t("Bb/D")).toBe("B♭/D");
    expect(t("F#7sus2")).toBe("F♯7sus2");
    expect(t("D#m+")).toBe("D♯m+");
    expect(t("E7b9")).toBe("E7♭9");
  });

  it("refuses typos", () => {
    expect(parseChord("H7", B)).toBeNull();
    expect(parseChord("C#m/Q", B)).toBeNull();
    expect(parseChord("C,", B)).toBeNull();
    expect(parseChord("Bmaj7e9", B)).toBeNull();
    expect(parseChord("Cmajor", B)).toBeNull();
  });

  it("accepts the qualities a chart uses", () => {
    for (const q of ["maj7", "min11", "m+", "m7#9", "7sus2", "7sus4", "add9", "6/9", "13b9", "dim7", "aug", "ø7", "°", "7alt", "m(maj7)", "M7", "Δ7", "9(#11)", "mi7", "7b5", "sus", "5", "o7", "7no3"]) {
      expect(parseChord(`C${q}`, B), q).not.toBeNull();
    }
    expect(chordText(parseChord("C6/9", B)!, B)).toBe("C6/9");
  });

  it("splits a bar evenly, holds with '.', refuses uneven counts", () => {
    const two = parseBar("Bmaj7 C#m11", B, T44);
    expect(two.ok && two.chords.map((c) => c.tick)).toEqual([0, 2 * PPQ]);
    const hold = parseBar("A . . E", B, T44);
    expect(hold.ok && hold.chords.map((c) => c.tick)).toEqual([0, 3 * PPQ]);
    expect(parseBar("A B C", B, T44).ok).toBe(false);
    expect(parseBar(". A", B, T44).ok).toBe(false);
    const nc = parseBar("NC", B, T44);
    expect(nc.ok && nc.chords[0]!.chord).toBeNull();
  });

  it("barText is the inverse of parseBar", () => {
    for (const text of ["Bmaj7", "Bmaj7 C♯m11", "A . . E", "N.C.", "A B C♯ D", ""]) {
      const p = parseBar(text, B, T44);
      expect(p.ok).toBe(true);
      if (p.ok) expect(barText(p.chords, B, T44)).toBe(text);
    }
  });

  it("diatonic rows read like a textbook", () => {
    expect(diatonicChords(B).map((c) => chordText(c, B)).join(" ")).toBe("B C♯m D♯m E F♯ G♯m A♯°");
    expect(diatonicChords(key("A", "minor")).map((c) => chordText(c, key("A", "minor"))).join(" ")).toBe(
      "Am B° C Dm Em F G",
    );
  });
});

describe("transpose — decision 2, on every chord in his chart", () => {
  const song = khwabon();
  const original = chordsOf(song);
  const unique = (xs: string[]) => [...new Set(xs)].join(" ");

  it("the chart has the PDF's chords and 73 bars", () => {
    expect(allBars(song).length).toBe(73);
    expect(unique(original)).toBe("Bmaj7 C♯min11 Emaj9 D♯m+ G♯m7♯9 A♯m7♯9 Amaj7 Emaj7 F♯7sus2");
  });

  it("B → A respells by letter, never enharmonically", () => {
    expect(unique(chordsOf(transpose(song, key("A"))))).toBe(
      "Amaj7 Bmin11 Dmaj9 C♯m+ F♯m7♯9 G♯m7♯9 Gmaj7 Dmaj7 E7sus2",
    );
  });

  it("B → F♯: A♯ becomes E♯, not F (non-negotiable 2)", () => {
    expect(unique(chordsOf(transpose(song, key("F#"))))).toBe(
      "F♯maj7 G♯min11 Bmaj9 A♯m+ D♯m7♯9 E♯m7♯9 Emaj7 Bmaj7 C♯7sus2",
    );
  });

  it("B → C♯: A♯ becomes B♯", () => {
    expect(chordsOf(transpose(song, key("C#")))).toContain("B♯m7♯9");
  });

  it("is lossless through every key and back", () => {
    let s = song;
    for (const k of KEYS) s = transpose(s, k);
    s = transpose(s, B);
    expect(chordsOf(s)).toEqual(original);
  });

  it("Set key keeps every chord as written", () => {
    const s = setKeyKeepChords(song, key("A"));
    expect(chordsOf(s)).toEqual(original);
    expect(keyName(s.key)).toBe("A");
  });
});

describe("rhythm — non-negotiable 1", () => {
  it("his strum and choke sum to a 4/4 bar exactly", () => {
    for (const p of starterPatterns()) {
      const r = parsePattern(p.text, T44);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.events.reduce((a, e) => a + e.ticks, 0)).toBe(barTicks(T44));
    }
  });

  it("refuses a short or long bar and says by how much", () => {
    expect(parsePattern("8 8 r16 8 8 8 4", T44)).toEqual({ ok: false, error: "short 1/16" });
    expect(parsePattern("4 4 4 4 8", T44)).toEqual({ ok: false, error: "over by 1/8" });
    expect(parsePattern("4 4 3 4", T44)).toEqual({ ok: false, error: '"3" is not a duration' });
    expect(parsePattern("2. 4", T44).ok).toBe(true);
  });

  it("the strum beams like the PDF: [8 8] r [8 8 8] r 4", () => {
    const r = parsePattern("8 8 r16 8 8 8 r16 4", T44);
    expect(r.ok && beamGroups(r.events, T44)).toEqual([[0, 1], [3, 5]]);
  });

  it("eight 8ths beam in half bars (Gould)", () => {
    const r = parsePattern("8 8 8 8 8 8 8 8", T44);
    expect(r.ok && beamGroups(r.events, T44)).toEqual([[0, 3], [4, 7]]);
  });

  it("a pattern that no longer fits the meter falls back to beats, never overfull", () => {
    const strum = starterPatterns()[0]!;
    const r = barRhythm(strum, [], { beats: 3, unit: 4 });
    expect(r.fellBack).toBe(true);
    expect(r.events.reduce((a, e) => a + e.ticks, 0)).toBe(barTicks({ beats: 3, unit: 4 }));
  });

  it("Slashes is one slash per chord, lasting until the next", () => {
    const p = parseBar("Bmaj7 C#m11", B, T44);
    const r = barRhythm({ id: "slashes", name: "Slashes", text: "" }, p.ok ? p.chords : [], T44);
    expect(r.events.map((e) => e.ticks)).toEqual([2 * PPQ, 2 * PPQ]);
    expect(r.stemless).toBe(true);
  });
});

describe("song edits", () => {
  it("% copies the previous bar, across a section boundary", () => {
    const song = khwabon();
    const firstChorusBar = song.sections[1]!.bars[0]!.id;
    const r = setBarText(song, firstChorusBar, "%");
    expect(r.error).toBeUndefined();
    expect(chordsOf(r.song)[4]).toBe("C♯min11");
  });

  it("a refused bar leaves the song untouched", () => {
    const song = khwabon();
    const r = setBarText(song, song.sections[0]!.bars[0]!.id, "H7");
    expect(r.error).toBeDefined();
    expect(r.song).toBe(song);
  });

  it("duplicate keeps chords and cues with fresh ids", () => {
    const song = khwabon();
    const d = duplicateSection(song, song.sections[1]!.id)!;
    const [a, b] = [d.song.sections[1]!, d.song.sections[2]!];
    expect(b.bars.map((x) => x.cueAbove)).toEqual(a.bars.map((x) => x.cueAbove));
    expect(new Set([...a.bars, ...b.bars].map((x) => x.id)).size).toBe(a.bars.length * 2);
    expect(d.song.sections.length).toBe(song.sections.length + 1);
  });

  it("a meter change keeps every chord visible inside its bar", () => {
    const song = khwabon();
    const id = song.sections[0]!.bars[0]!.id;
    const four = setBarText(song, id, "A . . E").song;
    const three = setTime(four, { beats: 3, unit: 4 });
    const bar = three.sections[0]!.bars[0]!;
    expect(bar.chords.map((c) => [c.tick, chordText(c.chord!, three.key)])).toEqual([[0, "A"], [2 * PPQ, "E"]]);
    // Untouched bars are the same objects: nothing else moved.
    expect(three.sections[1]).not.toBe(four.sections[1]);
    expect(three.sections[1]!.bars[0]).toBe(four.sections[1]!.bars[0]);
  });

  it("verses number themselves", () => {
    const song = khwabon();
    const d = duplicateSection(song, song.sections[2]!.id)!;
    expect(d.section.name).toBe("Verse 4");
  });
});

describe("range edits — decision 5", () => {
  const song = khwabon();
  const intro = song.sections[0]!.bars.map((b) => b.id);
  const chorus = song.sections[1]!.bars.map((b) => b.id);

  it("barRange crosses sections and works backwards", () => {
    expect(barRange(song, intro[2]!, chorus[1]!)).toEqual([intro[2], intro[3], chorus[0], chorus[1]]);
    expect(barRange(song, chorus[1]!, intro[2]!)).toEqual([intro[2], intro[3], chorus[0], chorus[1]]);
  });

  it("one repeat press puts |: on the first bar and :| on the last", () => {
    const s = setRepeat(song, intro, true, 3);
    const bars = s.sections[0]!.bars;
    expect(bars.map((b) => [!!b.repeatStart, b.repeatEnd?.times ?? 0])).toEqual([[true, 0], [false, 0], [false, 0], [false, 3]]);
    const off = setRepeat(s, intro, false);
    expect(off.sections[0]!.bars.every((b) => !b.repeatStart && !b.repeatEnd)).toBe(true);
  });

  it("an ending toggles on for all, then off for all", () => {
    const s = toggleEnding(song, intro.slice(0, 2), 1);
    expect(s.sections[0]!.bars.map((b) => b.ending)).toEqual([[1], [1], undefined, undefined]);
    const off = toggleEnding(s, intro.slice(0, 2), 1);
    expect(off.sections[0]!.bars.every((b) => !b.ending)).toBe(true);
  });

  it("copy and paste carry chords, rhythm and cues, not repeat signs", () => {
    const clip = copyBars(song, chorus.slice(0, 2));
    const r = pasteBars(song, intro[0]!, clip);
    const a = r.song.sections[0]!.bars[0]!;
    expect(a.cueAbove).toBe("Vocal 1 Enters");
    expect(a.repeatStart).toBeUndefined();
    expect(r.ids).toEqual(intro.slice(0, 2));
    // Pasting past the end stops at the last bar rather than inventing bars.
    const last = allBars(song).at(-1)!.bar.id;
    expect(pasteBars(song, last, clip).ids).toEqual([last]);
  });

  it("a pasted bar draws the rhythm it drew where it was copied", () => {
    // Verse 1 bar 1 is a Slashes override in a Strum section; Intro is Strum.
    const verse = song.sections[2]!.bars.map((b) => b.id);
    const onto = updateSection(song, song.sections[0]!.id, { pattern: "slashes" });
    const strum = copyBars(onto, [song.sections[1]!.bars[0]!.id]);
    const r = pasteBars(onto, intro[0]!, strum);
    expect(r.song.sections[0]!.bars[0]!.pattern).toBe("strum");
    const slashes = copyBars(song, [verse[0]!]);
    const r2 = pasteBars(onto, intro[1]!, slashes);
    expect(r2.song.sections[0]!.bars[1]!.pattern).toBeUndefined();
  });

  it("bar count grows and shrinks at the end, never below one", () => {
    const id = song.sections[0]!.id;
    expect(setBarCount(song, id, 6).sections[0]!.bars.length).toBe(6);
    expect(setBarCount(song, id, 2).sections[0]!.bars.map((b) => b.id)).toEqual(intro.slice(0, 2));
    expect(setBarCount(song, id, 0).sections[0]!.bars.length).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { chordText } from "../chord";
import { barContexts } from "../context";
import { khwabon } from "../khwabon";
import { pitchOf, writeAt } from "../notes";
import { KEYS, readSpelled, type Key } from "../pitch";
import { allBars, setBarNotes, setKeyChange, setTimeForBars, type Song } from "../song";
import { PPQ } from "../ticks";
import { fromChordPro, toChordPro } from "./chordpro";
import { chartFile, readChartFile, readShareCode, shareCode } from "./file";
import { toMusicXML } from "./musicxml";

const key = (name: string): Key => {
  const s = readSpelled(name)!.spelled;
  return KEYS.find((k) => k.mode === "major" && k.tonic.letter === s.letter && k.tonic.acc === s.acc)!;
};

/** His chart with everything decision 7–8 added: a key change, a meter change and a bar of notes. */
function everything(): Song {
  let s = khwabon();
  s = setKeyChange(s, s.sections.at(-1)!.bars[0]!.id, key("C#"));
  s = setTimeForBars(s, [s.sections[0]!.bars[3]!.id], { beats: 2, unit: 4 });
  const id = s.sections[1]!.bars[4]!.id;
  const ctx = barContexts(s).get(id)!;
  const p = (letter: number, acc: number, octave: number) => pitchOf({ letter, acc, octave }, ctx);
  let r = writeAt(undefined, { beats: 4, unit: 4 }, 0, PPQ / 2, [p(2, 0, 5)]);
  r = writeAt(r.runs, { beats: 4, unit: 4 }, r.next, PPQ * 1.5, [p(1, 1, 5), p(6, 0, 5)]);
  return setBarNotes(s, id, r.runs);
}

const chordsOf = (s: Song) => {
  const ctx = barContexts(s);
  return allBars(s).map((x) => x.bar.chords.map((c) => (c.chord ? chordText(c.chord, ctx.get(x.bar.id)!.key) : "N.C.")).join(" "));
};

describe("chart file — non-negotiable 5, on his real chart", () => {
  it("export → import is identical except the new id", () => {
    const s = everything();
    const r = readChartFile(chartFile(s));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect({ ...r.song, id: "" }).toEqual({ ...s, id: "" });
      expect(r.song.id).not.toBe(s.id);
    }
  });

  it("refuses what is not a chart, and a damaged chart", () => {
    expect(readChartFile("hello").ok).toBe(false);
    expect(readChartFile(JSON.stringify({ format: "other" })).ok).toBe(false);
    expect(readChartFile(JSON.stringify({ format: "sheet-music-maker", version: 1, song: { title: "x" } })).ok).toBe(false);
    expect(readChartFile(JSON.stringify({ format: "sheet-music-maker", version: 99, song: everything() })).ok).toBe(false);
  });

  it("the share link carries the chart whole, and a damaged link fails cleanly", async () => {
    const s = everything();
    const code = await shareCode(s);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    // Short enough for a chat message: well under the 8 KB that some apps truncate links at.
    expect(code.length).toBeLessThan(8000);
    const r = await readShareCode(code);
    expect(r.ok && { ...r.song, id: "" }).toEqual({ ...s, id: "" });
    expect((await readShareCode(code.slice(0, 40) + "xx")).ok).toBe(false);
  });
});

describe("ChordPro", () => {
  it("his chart out and back keeps every chord, section, repeat and ending", () => {
    const s = everything();
    const text = toChordPro(s);
    expect(text).toContain('{start_of_grid label="Chorus" shape="4x4"}');
    expect(text).toContain("|: Bmaj7 . . . |");
    expect(text).toContain("{time: 2/4}");
    const r = fromChordPro(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.skipped).toEqual([]);
    expect(r.song.title).toBe("Khwabon ke Parindey");
    expect(chordsOf(r.song)).toEqual(chordsOf(s));
    expect(r.song.sections.map((x) => x.name)).toEqual(s.sections.map((x) => x.name));
    const reps = (x: Song) => allBars(x).map((b) => `${b.bar.repeatStart ? "|:" : ""}${b.bar.repeatEnd ? `:|${b.bar.repeatEnd.times}` : ""}`).join(",");
    expect(reps(r.song)).toEqual(reps(s));
    expect(barContexts(r.song).get(r.song.sections.at(-1)!.bars[0]!.id)!.key.tonic).toEqual(key("C#").tonic);
  });

  it("reads a hand-written grid with %, ~, endings and a repeat count", () => {
    const r = fromChordPro(`{title: Test}\n{key: G}\n{start_of_grid shape="4x4"}\n|: G . . . | % . . . |1 C . D~Em . :|2 Am . . . | D . . . :| 3x\n{end_of_grid}`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const bars = r.song.sections[0]!.bars;
    expect(chordsOf(r.song)).toEqual(["G", "G", "C D Em", "Am", "D"]);
    expect(bars[2]!.ending).toEqual([1]);
    expect(bars[2]!.chords.map((c) => c.tick)).toEqual([0, 2 * PPQ, 2.5 * PPQ]);
    expect(bars[3]!.ending).toEqual([2]);
    expect(bars[4]!.repeatEnd).toEqual({ times: 3 });
  });

  it("reads lyric-style ChordPro as one bar per chord, under its sections", () => {
    const r = fromChordPro(`{t: Song}\n{key: D}\n{start_of_verse}\n[D]Here we [G]go\n{end_of_verse}\n{start_of_chorus}\n[A]La [Hx]la\n{end_of_chorus}`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.song.sections.map((s) => s.name)).toEqual(["Verse", "Chorus"]);
    expect(chordsOf(r.song)).toEqual(["D", "G", "A"]);
    expect(r.skipped).toEqual(["Hx"]);
  });
});

describe("MusicXML", () => {
  const xml = toMusicXML(everything());

  it("is well-formed: every tag closes", () => {
    const stack: string[] = [];
    for (const m of xml.matchAll(/<(\/?)([a-z-]+)[^>]*?(\/?)>/g)) {
      if (m[3]) continue;
      if (m[1]) expect(stack.pop()).toBe(m[2]);
      else stack.push(m[2]!);
    }
    expect(stack).toEqual([]);
  });

  it("a note tied over the barline stops its tie on the next bar's first note", () => {
    let s = khwabon();
    const [a, b] = [s.sections[0]!.bars[0]!.id, s.sections[0]!.bars[1]!.id];
    const p = pitchOf({ letter: 6, acc: 0, octave: 4 }, barContexts(s).get(a)!);
    const runsA = writeAt(undefined, { beats: 4, unit: 4 }, 0, PPQ * 4, [p]).runs.map((r) => ({ ...r, tie: true }));
    s = setBarNotes(s, a, runsA);
    s = setBarNotes(s, b, writeAt(undefined, { beats: 4, unit: 4 }, 0, PPQ * 4, [p]).runs);
    const x = toMusicXML(s);
    const m2 = x.split("<measure ")[2]!;
    expect(x.split("<measure ")[1]).toContain('<tie type="start"/>');
    expect(m2).toContain('<tie type="stop"/>');
  });

  it("has every bar, every chord, slash noteheads, the notes, key and meter changes", () => {
    const s = everything();
    expect((xml.match(/<measure /g) ?? []).length).toBe(allBars(s).length);
    expect((xml.match(/<harmony>/g) ?? []).length).toBe(allBars(s).reduce((n, b) => n + b.bar.chords.length, 0));
    expect(xml).toContain("<notehead>slash</notehead>");
    expect(xml).toContain("<step>E</step><octave>5</octave>");
    expect(xml).toContain("<chord/>");
    expect(xml).toContain('<kind text="min11">minor-11th</kind>');
    expect((xml.match(/<key>/g) ?? []).length).toBe(2);
    expect(xml).toContain("<beats>2</beats>");
    expect(xml).toContain('<repeat direction="backward" times="4"/>');
    expect(xml).toContain('<words enclosure="rectangle">Vocal 1 Enters</words>');
  });
});

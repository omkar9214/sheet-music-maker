import { describe, expect, it } from "vitest";
import { khwabon } from "../../core/khwabon";
import { KEYS } from "../../core/pitch";
import { builtinPatterns, starterPatterns } from "../../core/rhythm";
import { allBars, emptyBar, emptySong, transpose, updateBar } from "../../core/song";
import { layoutSong, MAX_BARS_PER_SYSTEM, type Measure } from "./layout";
import { MARGIN_BOTTOM, MARGIN_X, CONTENT_W, PAGE_H, SIZE } from "./metrics";

/** Edwin is about 0.47 em per character in a chord symbol. That is close enough to test geometry,
 * which is all this asserts. The real widths come from the font in the browser. */
const measure: Measure = (text, size) => text.length * size * 0.47;

describe("layout of his chart (AGENTS.md §9.10: the real path)", () => {
  const song = khwabon();
  const pages = layoutSong(song, measure);
  const systems = pages.flatMap((p) => p.systems);
  const bars = systems.flatMap((s) => s.bars);

  it("draws every bar once, in order", () => {
    expect(bars.map((b) => b.number)).toEqual(allBars(song).map((x) => x.number));
  });

  it("starts every section on a new system, labelled with a colon as in the PDF", () => {
    const labels = systems.filter((s) => s.label).map((s) => s.label);
    expect(labels).toEqual(song.sections.map((s) => `${s.name}:`));
    for (const s of systems) {
      expect(new Set(s.bars.map((b) => b.sectionId)).size).toBe(1);
    }
  });

  it("fits four strum bars on a system, the Intro included", () => {
    expect(systems[0]!.bars.length).toBe(4);
  });

  it("starts every system at the left margin, the first included (decision 16)", () => {
    for (const s of systems) expect(s.x0).toBe(MARGIN_X);
  });

  it("justifies every system to the right margin, and nothing runs past it", () => {
    for (const s of systems) {
      const last = s.bars[s.bars.length - 1]!;
      expect(last.x + last.w).toBeCloseTo(MARGIN_X + CONTENT_W, 6);
      for (const b of s.bars) for (const e of b.events) expect(e.x).toBeLessThan(b.x + b.w);
    }
  });

  it("never lets a chord symbol run into the next one in its bar", () => {
    for (const b of bars)
      for (let i = 0; i + 1 < b.chords.length; i++) {
        const c = b.chords[i]!;
        expect(c.x + measure(c.text, SIZE.chord)).toBeLessThan(b.chords[i + 1]!.x);
      }
  });

  it("never splits a system across pages, and every system is inside the page", () => {
    for (const s of systems) {
      expect(s.top).toBeLessThan(s.y);
      expect(s.bottom).toBeLessThanOrEqual(PAGE_H - MARGIN_BOTTOM);
    }
  });

  it("only the first system has a time signature and a tempo; the rest carry a bar number", () => {
    expect(systems[0]!.time).toBeDefined();
    expect(systems[0]!.tempo).toBe(90);
    expect(systems.slice(1).every((s) => !s.time && s.tempo === undefined && s.barNumber !== undefined)).toBe(true);
  });

  it("prints 4x under the Outro's closing repeat, and only there", () => {
    const counts = systems.flatMap((s) => s.below.filter((it) => it.kind === "count").map((it) => it.text));
    expect(counts).toEqual(["4x"]);
  });

  it("stacks two cues above that would collide, rather than overlapping them", () => {
    const first = song.sections[0]!.bars;
    let s2 = updateBar(song, first[0]!.id, { cueAbove: "A very long cue that runs well past its own bar" });
    s2 = updateBar(s2, first[1]!.id, { cueAbove: "Second" });
    const sys = layoutSong(s2, measure)[0]!.systems[0]!;
    expect(sys.boxRows).toBe(2);
    const [a, b] = sys.above;
    expect(a!.row).not.toBe(b!.row);
  });

  it("closes an ending bracket only on a repeat", () => {
    const melody = song.sections[3]!.bars;
    let s2 = updateBar(song, melody[2]!.id, { ending: [1] });
    s2 = updateBar(s2, melody[3]!.id, { ending: [1], repeatEnd: { times: 2 } });
    const flat = layoutSong(s2, measure).flatMap((p) => p.systems.flatMap((s) => s.bars));
    const e = flat.filter((b) => b.bar.ending);
    expect(e.map((b) => [b.endingStart, b.endingClosed])).toEqual([[true, false], [false, true]]);
  });

  it("ends the chart on a final barline unless it ends on a repeat", () => {
    expect(bars[bars.length - 1]!.final).toBe(false);
    const outro = song.sections[song.sections.length - 1]!.bars;
    const s2 = updateBar(song, outro[outro.length - 1]!.id, { repeatEnd: undefined });
    const flat = layoutSong(s2, measure).flatMap((p) => p.systems.flatMap((s) => s.bars));
    expect(flat[flat.length - 1]!.final).toBe(true);
  });

  it("lifts the tempo only when it would hit the first chord (the sweep): in C yes, in B (his PDF) no", () => {
    const real: Measure = (t, size) => t.length * size * 0.5;
    expect(layoutSong(song, real)[0]!.systems[0]!.tempoRaise).toBe(0);
    // In C at ♩ = 123 (his Intro, decision 16). At 90 it collided only while the tempo sat 1.8 sp in;
    // flush with the staff (TEMPO_X = 0) "= 90" now fits before the first chord, and stays down.
    const c = transpose(song, KEYS[0]!);
    expect(layoutSong({ ...c, tempo: 123 }, real)[0]!.systems[0]!.tempoRaise).toBeGreaterThan(0);
    expect(layoutSong(c, real)[0]!.systems[0]!.tempoRaise).toBe(0);
    // In 6/8 the tempo's beat is the dotted quarter.
    expect(layoutSong({ ...song, time: { beats: 6, unit: 8 } }, real)[0]!.systems[0]!.tempoDotted).toBe(true);
  });
});

describe("bars per system (decision 11: \"4 bars max\")", () => {
  // Before the cap, a 16-bar section broke Slashes 14 + 2 and Beats 6 + 7 + 3.
  for (const p of [...builtinPatterns(), ...starterPatterns()]) {
    it(`breaks 16 ${p.name} bars 4 + 4 + 4 + 4`, () => {
      const s = emptySong();
      s.sections[0] = { ...s.sections[0]!, pattern: p.id, bars: Array.from({ length: 16 }, emptyBar) };
      const counts = layoutSong(s, measure).flatMap((pg) => pg.systems).map((x) => x.bars.length);
      expect(counts).toEqual([4, 4, 4, 4]);
    });
  }

  it("never puts more than four on a line in his chart", () => {
    const counts = layoutSong(khwabon(), measure).flatMap((pg) => pg.systems).map((x) => x.bars.length);
    expect(Math.max(...counts)).toBe(MAX_BARS_PER_SYSTEM);
  });
});

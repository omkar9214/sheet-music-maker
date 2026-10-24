/**
 * Regressions from the decision-10 sweep (`docs/audit/2026-10-24-sweep.md`). Each was proven to fail
 * before its fix.
 */
import { describe, expect, it } from "vitest";
import { barContexts } from "./context";
import { khwabon } from "./khwabon";
import { restBar } from "./notes";
import { patternFits, starterPatterns } from "./rhythm";
import { allBars, clearTimeForBars, deleteBars, setBarNotes, setBarsPattern, setBarsRhythm, setTimeForBars } from "./song";

const T44 = { beats: 4, unit: 4 as const };
const T24 = { beats: 2, unit: 4 as const };

describe("sweep — meters", () => {
  it("picking the meter already in force stores nothing", () => {
    const s = khwabon();
    const id = s.sections[0]!.bars[1]!.id;
    const out = setTimeForBars(s, [id], T44);
    expect(allBars(out).some((x) => x.bar.timeChange)).toBe(false);
  });

  it("× removes the change and the revert it made, leaving no stray change", () => {
    const s = khwabon();
    const id = s.sections[0]!.bars[1]!.id;
    const set = setTimeForBars(s, [id], T24);
    expect(allBars(set).filter((x) => x.bar.timeChange).length).toBe(2);
    const cleared = clearTimeForBars(set, [id]);
    expect(allBars(cleared).some((x) => x.bar.timeChange)).toBe(false);
    // Picking 4/4 again on the 2/4 bar is the same as ×.
    expect(allBars(setTimeForBars(set, [id], T44)).some((x) => x.bar.timeChange)).toBe(false);
  });
});

describe("sweep — deleting a whole section's bars", () => {
  it("removes the section instead of leaving an empty bar", () => {
    const s = khwabon();
    const solo = s.sections.find((x) => x.name === "Solo")!;
    const out = deleteBars(s, solo.bars.map((b) => b.id));
    expect(out.sections.some((x) => x.id === solo.id)).toBe(false);
    expect(out.sections.length).toBe(s.sections.length - 1);
  });

  it("a part of a section still deletes bars only", () => {
    const s = khwabon();
    const solo = s.sections.find((x) => x.name === "Solo")!;
    const out = deleteBars(s, [solo.bars[0]!.id]);
    expect(out.sections.find((x) => x.id === solo.id)!.bars.length).toBe(3);
  });

  it("the whole chart selected keeps one section with one bar", () => {
    const s = khwabon();
    const out = deleteBars(s, allBars(s).map((x) => x.bar.id));
    expect(out.sections.length).toBe(1);
    expect(out.sections[0]!.bars.length).toBe(1);
  });
});

describe("sweep — a bar holding notes can be made slashes again", () => {
  const withNotes = () => {
    const s = khwabon();
    const id = s.sections[0]!.bars[0]!.id;
    return { s: setBarNotes(s, id, restBar(barContexts(s).get(id)!.time)), id };
  };
  it("by a rhythm chip", () => {
    const { s, id } = withNotes();
    expect(setBarsPattern(s, [id], "choke").sections[0]!.bars[0]!.notes).toBeUndefined();
  });
  it("by the step grid", () => {
    const { s, id } = withNotes();
    expect(setBarsRhythm(s, [id], "4 4 4 4").sections[0]!.bars[0]!.notes).toBeUndefined();
  });
});

describe("sweep — patterns offered only where they fit", () => {
  it("his 4/4 strum does not fit 6/8; built-ins always do", () => {
    const [strum] = starterPatterns();
    expect(patternFits(strum!, T44)).toBe(true);
    expect(patternFits(strum!, { beats: 6, unit: 8 })).toBe(false);
    expect(patternFits({ id: "slashes", name: "Slashes", text: "" }, { beats: 6, unit: 8 })).toBe(true);
  });
});

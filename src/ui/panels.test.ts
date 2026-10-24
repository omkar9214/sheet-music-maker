import { describe, expect, it } from "vitest";
import { clampWidth, DEFAULT_WIDTHS, LIMITS, PANELS_KEY, readWidths, writeWidths } from "./panels";

function mem(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe("sidebar widths (decision 14)", () => {
  it("defaults to the widths before the handles existed", () => {
    expect(readWidths(mem())).toEqual({ form: 220, inspector: 300 });
  });

  it("clamps a drag to each side's limits", () => {
    expect(clampWidth("form", 10)).toBe(LIMITS.form.min);
    expect(clampWidth("form", 9999)).toBe(LIMITS.form.max);
    expect(clampWidth("inspector", 333.6)).toBe(334);
  });

  it("round-trips, and never touches the chart library's key", () => {
    const s = mem({ "smm.library.v1": "HIS SCORE" });
    writeWidths(s, { form: 300, inspector: 400 });
    expect(readWidths(s)).toEqual({ form: 300, inspector: 400 });
    expect(s.m.get("smm.library.v1")).toBe("HIS SCORE");
    expect([...s.m.keys()].sort()).toEqual([PANELS_KEY, "smm.library.v1"].sort());
  });

  it("falls back on junk and on a stored width outside the limits", () => {
    expect(readWidths(mem({ [PANELS_KEY]: "{not json" }))).toEqual(DEFAULT_WIDTHS);
    expect(readWidths(mem({ [PANELS_KEY]: JSON.stringify({ form: 5, inspector: "x" }) }))).toEqual({
      form: LIMITS.form.min,
      inspector: DEFAULT_WIDTHS.inspector,
    });
  });
});

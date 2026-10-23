import { describe, expect, it } from "vitest";
import type { Step } from "../core/rhythm";
import { clickStep, shownSteps } from "./RhythmGrid";

const g = (s: string): Step[] => [...s].map((c) => (c === "x" ? "hit" : c === "-" ? "hold" : "rest"));
const show = (s: readonly Step[]) => s.map((x) => (x === "hit" ? "x" : x === "hold" ? "-" : ".")).join("");

describe("step clicks — every click changes what is drawn", () => {
  it("a leading ring reads as silence, and one click makes it a strum", () => {
    expect(show(shownSteps(g("--x-")))).toBe("..x-");
    expect(show(clickStep(g("--x-"), 0))).toBe("x-x-");
  });

  it("strum → silence → ring, when a ring would sound", () => {
    let s = g("x-x-");
    s = clickStep(s, 2);
    expect(show(shownSteps(s))).toBe("x-..");
    s = clickStep(s, 2);
    expect(show(shownSteps(s))).toBe("x---");
  });

  it("every state of every step changes on click (exhaustive over 3^4 grids)", () => {
    const kinds: Step[] = ["hit", "hold", "rest"];
    for (let n = 0; n < 81; n++) {
      const s: Step[] = [0, 1, 2, 3].map((i) => kinds[Math.floor(n / 3 ** i) % 3]!);
      for (let i = 0; i < 4; i++) {
        expect(shownSteps(clickStep(s, i))[i], `${show(s)} @${i}`).not.toBe(shownSteps(s)[i]);
      }
    }
  });
});

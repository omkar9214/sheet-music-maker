import { describe, expect, it } from "vitest";
import { PAGE_W } from "./engrave/metrics";
import { fitScale, SCALE } from "./Sheet";

describe("page scale on phones and tablets (decision 18)", () => {
  it("fits a 375-px phone's width less its gutters", () => {
    expect(fitScale(375 - 16) * PAGE_W).toBeCloseTo(359, 6);
  });
  it("never grows past the desktop scale on a wide tablet", () => {
    expect(fitScale(2000)).toBe(SCALE);
  });
});

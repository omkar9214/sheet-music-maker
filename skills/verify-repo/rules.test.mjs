import { describe, expect, it } from "vitest";
import { coreImportsUi, usesAny, worklogEntries, worklogRewritten } from "./rules.mjs";

// §9.2: each rule is shown to fire on a known-bad input and stay quiet on a good one.
describe("verify-repo rules", () => {
  it("core importing ui", () => {
    expect(coreImportsUi("src/core/score.ts", `import { x } from "../ui/Staff";`)).toHaveLength(1);
    expect(coreImportsUi("src/core/score.ts", `import { y } from "./ticks";`)).toEqual([]);
    expect(coreImportsUi("src/ui/Staff.tsx", `import { x } from "../ui/Note";`)).toEqual([]);
  });
  it("any", () => {
    expect(usesAny("a.ts", "const a: any = 1;")).toHaveLength(1);
    expect(usesAny("a.ts", "f(x as any);")).toHaveLength(1);
    expect(usesAny("a.ts", "const many = 1; // any comment")).toEqual([]);
  });
  it("worklog rewritten", () => {
    expect(worklogRewritten("a\nb\n", "a\nb\nc\n")).toEqual([]);
    expect(worklogRewritten("a\nb\n", "a\nB\nc\n")).toHaveLength(1);
    expect(worklogRewritten(null, "anything")).toEqual([]);
  });
  it("worklog entries", () => {
    const d = (n) => `## 2026-10-22 — Claude — decision ${n}: x\n\n**Type:** decision\n\n> *"words"*\n`;
    const w = `## 2026-10-22 — Claude — work: y\n\n**Type:** work\n\n**Verified:** EXIT=0\n`;
    expect(worklogEntries(d(1) + w + d(2))).toEqual([]);
    expect(worklogEntries(d(1) + d(3))).toHaveLength(1);
    expect(worklogEntries(`## 2026-10-22 — Claude — work: y\n\n**Type:** work\n`)).toHaveLength(1);
    expect(worklogEntries(`## 2026-10-22 — Claude — decision 1: x\n\n**Type:** decision\n`)).toHaveLength(1);
    expect(worklogEntries(`## 2026-10-22 — Claude — note\n\nno type\n`)).toHaveLength(1);
  });
});

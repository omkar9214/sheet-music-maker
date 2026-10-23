import { describe, expect, it } from "vitest";
import { khwabon } from "../core/khwabon";
import { currentToken, replaceToken, suggest } from "./suggest";

describe("chord suggestions on his chart", () => {
  const song = khwabon();

  it("offers the song's chords first, most used first, when nothing is typed", () => {
    expect(suggest(song, "").slice(0, 2)).toEqual(["C♯min11", "Bmaj7"]);
  });

  it("narrows by root, sloppy typing included", () => {
    const s = suggest(song, "c#");
    expect(s[0]).toBe("C♯min11");
    expect(s.every((t) => t.startsWith("C♯"))).toBe(true);
    expect(suggest(song, "C#m")[0]).toBe("C♯min11");
    expect(suggest(song, "g#m7")).toContain("G♯m7♯9");
  });

  it("does not offer C♯ chords for C, or anything for a non-root", () => {
    expect(suggest(song, "c").every((t) => /^C(?![♯♭])/.test(t))).toBe(true);
    expect(suggest(song, "h")).toEqual([]);
  });

  it("works on the last token only", () => {
    expect(currentToken("Bmaj7 c#")).toBe("c#");
    expect(replaceToken("Bmaj7 c#", "C♯min11")).toBe("Bmaj7 C♯min11");
    expect(replaceToken("", "E")).toBe("E");
  });
});

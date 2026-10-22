/**
 * *Khwabon ke Parindey* (ZNMD), transcribed bar by bar from `docs/reference/Khwabon ke Parindey.pdf`,
 * the chart Omkar sent with decision 2. It is the first-run chart and the real-path test
 * (AGENTS.md §9.10): if this does not draw like the PDF, nothing does.
 *
 * Each row is: chords as typed into a bar box, then optional fields. `p` is the pattern when it
 * differs from the section's. The cues are his words, copied exactly, curly quotes included.
 */
import { parseBar } from "./chord";
import { KEYS } from "./pitch";
import { builtinPatterns, starterPatterns } from "./rhythm";
import { emptyBar, newId, type Bar, type Section, type Song } from "./song";

interface Row {
  c: string;
  p?: string;
  above?: string;
  below?: string;
  rs?: true;
  re?: number;
}

const S: Array<{ name: string; pattern: string; rows: Row[] }> = [
  { name: "Intro", pattern: "strum", rows: [
    { c: "Bmaj7", below: "Acoustic Guitar only" }, { c: "Bmaj7" }, { c: "C#min11" }, { c: "C#min11" },
  ] },
  { name: "Chorus", pattern: "strum", rows: [
    { c: "Bmaj7", rs: true, above: "Vocal 1 Enters", below: "Band Enters - Vocal 1, Shakers, Bass, Ele Guitar Strums" },
    { c: "Bmaj7" }, { c: "C#min11" }, { c: "C#min11", re: 2 },
    { c: "Emaj9", above: "Vocal Harmony on “Oho”", below: "Lyric: Oho Kya Pata... Keys Enter" },
    { c: "C#min11" }, { c: "Bmaj7" }, { c: "C#min11" },
  ] },
  { name: "Verse 1", pattern: "strum", rows: [
    { c: "Bmaj7 C#min11", p: "slashes", above: "Both Vocals Unison" }, { c: "D#m+", p: "slashes" },
    { c: "G#m7#9 A#m7#9", p: "slashes" }, { c: "Amaj7", p: "slashes" },
    { c: "C#min11", above: "Vocal 2 adds Harmony" }, { c: "Bmaj7" }, { c: "C#min11" }, { c: "Bmaj7" },
    { c: "C#min11", above: "Vocal 1 Alone" }, { c: "C#min11", p: "choke", below: "Choke" },
  ] },
  { name: "Melody", pattern: "strum", rows: [
    { c: "Bmaj7", below: "Drums Enter" }, { c: "Bmaj7" }, { c: "C#min11" }, { c: "C#min11" },
  ] },
  { name: "Chorus", pattern: "strum", rows: [
    { c: "Bmaj7", rs: true, above: "Vocal Lead change (maybe)", below: "Ele Guitar and keys add fillers" },
    { c: "Bmaj7" }, { c: "C#min11", above: "Harmony on “Khwabon ke Parindey”" }, { c: "C#min11", re: 2 },
    { c: "Emaj9", above: "Harmony on “Oho”" }, { c: "C#min11" },
    { c: "Bmaj7", above: "Harmony on “kahaan”" }, { c: "C#min11" },
  ] },
  { name: "Verse 2", pattern: "strum", rows: [
    { c: "Bmaj7 C#min11", p: "slashes", above: "Both Vocals" }, { c: "D#m+", p: "slashes" },
    { c: "G#m7#9 A#m7#9", p: "slashes" }, { c: "Amaj7", p: "slashes" },
    { c: "C#min11" }, { c: "Bmaj7" }, { c: "C#min11", above: "Harmony on “Bas ek pal mein...”" }, { c: "Bmaj7" },
    { c: "C#min11", above: "Single Vocal on “Oho”" }, { c: "C#min11", p: "choke", below: "Choke" },
  ] },
  { name: "Solo", pattern: "strum", rows: [
    { c: "Bmaj7", rs: true }, { c: "Bmaj7" }, { c: "C#min11" }, { c: "C#min11", re: 2, below: "Solo ends on cue" },
  ] },
  { name: "Bridge", pattern: "strum", rows: [
    { c: "Bmaj7", above: "Male Vocal (maybe)", below: "Keys - Strings with reverb" },
    { c: "Bmaj7" }, { c: "C#min11" }, { c: "C#min11" }, { c: "Bmaj7" }, { c: "Bmaj7" }, { c: "C#min11" },
    { c: "Emaj7", p: "slashes", above: "All 3 Vocals on “Ab jeena...”" }, { c: "F#7sus2", p: "slashes" },
    { c: "Bmaj7", p: "slashes" }, { c: "Bmaj7", p: "slashes" },
  ] },
  { name: "Verse 3", pattern: "strum", rows: [
    { c: "Bmaj7 C#min11", p: "slashes", above: "Both female Vocals" }, { c: "D#m+", p: "slashes" },
    { c: "G#m7#9 A#m7#9", p: "slashes" }, { c: "Amaj7", p: "slashes" },
    { c: "C#min11", above: "Lead Vocals with Harmony" }, { c: "Bmaj7" }, { c: "C#min11" }, { c: "Bmaj7" },
    { c: "C#min11", above: "Lead Vocal on “Oho”" }, { c: "C#min11", p: "choke", below: "Choke" },
  ] },
  { name: "Outro", pattern: "strum", rows: [
    { c: "Bmaj7", rs: true, above: "Both Vocals + Ele Guitar improvise", below: "Drum exits. Shakers enter" },
    { c: "Bmaj7" }, { c: "C#min11" }, { c: "C#min11", re: 4 },
  ] },
];

export function khwabon(): Song {
  const key = KEYS.find((k) => k.mode === "major" && k.tonic.letter === 6 && k.tonic.acc === 0)!;
  const time = { beats: 4, unit: 4 as const };
  const sections: Section[] = S.map((s) => ({
    id: newId("x"),
    name: s.name,
    pattern: s.pattern,
    bars: s.rows.map((r) => {
      const p = parseBar(r.c, key, time);
      if (!p.ok) throw new Error(`khwabon: ${r.c}: ${p.error}`);
      const bar: Bar = { ...emptyBar(), chords: p.chords };
      if (r.p) bar.pattern = r.p;
      if (r.above) bar.cueAbove = r.above;
      if (r.below) bar.cueBelow = r.below;
      if (r.rs) bar.repeatStart = true;
      if (r.re) bar.repeatEnd = { times: r.re };
      return bar;
    }),
  }));
  return {
    id: newId("s"),
    title: "Khwabon ke Parindey",
    source: "ZNMD",
    key,
    tempo: 90,
    time,
    clef: "treble8vb",
    patterns: [...builtinPatterns(), ...starterPatterns()],
    sections,
  };
}

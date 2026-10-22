/**
 * The chart, as data (non-negotiable 3). Every edit is a pure function from Song to Song, so undo
 * is a stack of values and the page is always compiled from one of them.
 */
import { parseBar, rekeyChord, type BarChord } from "./chord";
import { KEYS, sameKey, type Key } from "./pitch";
import { builtinPatterns, starterPatterns, SLASHES_ID, type Pattern } from "./rhythm";
import { barTicks, beatTicks, type TimeSig } from "./ticks";

export type Clef = "treble8vb" | "treble" | "bass";

export type Marker = "segno" | "coda";
export type Jump = "toCoda" | "dsAlCoda" | "dcAlCoda" | "dcAlFine" | "fine";

export interface Bar {
  id: string;
  chords: BarChord[];
  /** Overrides the section's pattern. */
  pattern?: string;
  /** Boxed, above the staff: "Vocal 1 Enters". */
  cueAbove?: string;
  /** Plain, below the staff: "Band Enters - Vocal 1, …". */
  cueBelow?: string;
  repeatStart?: boolean;
  /** Present when the bar closes a repeat. Times played; above 2 prints "N×". */
  repeatEnd?: { times: number };
  /** Volta numbers this bar belongs to: [1], or [1, 2] for "1, 2.". */
  ending?: number[];
  marker?: Marker;
  jump?: Jump;
}

export interface Section {
  id: string;
  name: string;
  pattern: string;
  bars: Bar[];
}

export interface Song {
  id: string;
  title: string;
  source: string;
  key: Key;
  tempo: number;
  time: TimeSig;
  clef: Clef;
  /** Built-ins first, then the song's own. */
  patterns: Pattern[];
  sections: Section[];
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyBar(): Bar {
  return { id: newId("b"), chords: [] };
}

export function emptySong(): Song {
  const time: TimeSig = { beats: 4, unit: 4 };
  return {
    id: newId("s"),
    title: "Untitled",
    source: "",
    key: KEYS[0]!,
    tempo: 90,
    time,
    clef: "treble8vb",
    patterns: [...builtinPatterns(), ...starterPatterns()],
    sections: [{ id: newId("x"), name: "Intro", pattern: "strum", bars: [emptyBar(), emptyBar(), emptyBar(), emptyBar()] }],
  };
}

export function patternById(song: Song, id: string | undefined): Pattern | undefined {
  return song.patterns.find((p) => p.id === id);
}

/** The pattern a bar draws: its own, else its section's. */
export function barPatternId(section: Section, bar: Bar): string {
  return bar.pattern ?? section.pattern;
}

export interface BarRef {
  section: number;
  bar: number;
}

export function allBars(song: Song): Array<{ ref: BarRef; bar: Bar; section: Section; number: number }> {
  const out: Array<{ ref: BarRef; bar: Bar; section: Section; number: number }> = [];
  let n = 1;
  song.sections.forEach((section, si) =>
    section.bars.forEach((bar, bi) => out.push({ ref: { section: si, bar: bi }, bar, section, number: n++ })),
  );
  return out;
}

export function findBar(song: Song, id: string): BarRef | null {
  for (const [si, s] of song.sections.entries()) {
    const bi = s.bars.findIndex((b) => b.id === id);
    if (bi >= 0) return { section: si, bar: bi };
  }
  return null;
}

/** The bar before `id` in reading order, across sections, for `%`. */
export function previousBar(song: Song, id: string): Bar | null {
  const flat = allBars(song);
  const i = flat.findIndex((x) => x.bar.id === id);
  return i > 0 ? flat[i - 1]!.bar : null;
}

function mapBar(song: Song, id: string, f: (b: Bar) => Bar): Song {
  return {
    ...song,
    sections: song.sections.map((s) =>
      s.bars.some((b) => b.id === id) ? { ...s, bars: s.bars.map((b) => (b.id === id ? f(b) : b)) } : s,
    ),
  };
}

function mapSection(song: Song, id: string, f: (s: Section) => Section): Song {
  return { ...song, sections: song.sections.map((s) => (s.id === id ? f(s) : s)) };
}

export function setBarText(song: Song, barId: string, text: string): { song: Song; error?: string } {
  const prev = previousBar(song, barId)?.chords ?? [];
  const p = parseBar(text, song.key, song.time, prev);
  if (!p.ok) return { song, error: p.error };
  return { song: mapBar(song, barId, (b) => ({ ...b, chords: p.chords })) };
}

export function updateBar(song: Song, barId: string, patch: Partial<Omit<Bar, "id">>): Song {
  return mapBar(song, barId, (b) => {
    const next: Bar = { ...b, ...patch };
    // An absent field and an `undefined` one must be the same chart, or a saved chart would differ
    // from the one in memory by keys alone.
    for (const k of Object.keys(next) as Array<keyof Bar>) if (next[k] === undefined) delete next[k];
    if (next.cueAbove === "") delete next.cueAbove;
    if (next.cueBelow === "") delete next.cueBelow;
    if (next.ending && next.ending.length === 0) delete next.ending;
    return next;
  });
}

export function updateSection(song: Song, id: string, patch: Partial<Omit<Section, "id" | "bars">>): Song {
  return mapSection(song, id, (s) => ({ ...s, ...patch }));
}

/** Verses number themselves (the PDF has Verse 1–3), and nothing else does. */
export function nextSectionName(song: Song, base: string): string {
  if (base !== "Verse") return base;
  const n = song.sections.filter((s) => /^Verse\b/.test(s.name)).length;
  return `Verse ${n + 1}`;
}

export function addSection(song: Song, afterIndex: number, base: string, bars = 4): { song: Song; section: Section } {
  const prev = song.sections[afterIndex];
  const section: Section = {
    id: newId("x"),
    name: nextSectionName(song, base),
    pattern: prev?.pattern ?? SLASHES_ID,
    bars: Array.from({ length: bars }, emptyBar),
  };
  const sections = [...song.sections];
  sections.splice(afterIndex + 1, 0, section);
  return { song: { ...song, sections }, section };
}

/** Chorus again: the copy carries chords, cues and repeats, with fresh ids. */
export function duplicateSection(song: Song, id: string): { song: Song; section: Section } | null {
  const i = song.sections.findIndex((s) => s.id === id);
  const src = song.sections[i];
  if (!src) return null;
  const section: Section = {
    ...structuredClone(src),
    id: newId("x"),
    name: nextSectionName(song, /^Verse\b/.test(src.name) ? "Verse" : src.name),
    bars: src.bars.map((b) => ({ ...structuredClone(b), id: newId("b") })),
  };
  const sections = [...song.sections];
  sections.splice(i + 1, 0, section);
  return { song: { ...song, sections }, section };
}

export function deleteSection(song: Song, id: string): Song {
  if (song.sections.length <= 1) return song;
  return { ...song, sections: song.sections.filter((s) => s.id !== id) };
}

export function moveSection(song: Song, id: string, by: -1 | 1): Song {
  const i = song.sections.findIndex((s) => s.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= song.sections.length) return song;
  const sections = [...song.sections];
  [sections[i], sections[j]] = [sections[j]!, sections[i]!];
  return { ...song, sections };
}

/** Inserts an empty bar after `barId` (or before, with `before`). Returns the new bar's id. */
export function insertBar(song: Song, barId: string, before = false): { song: Song; id: string } {
  const ref = findBar(song, barId);
  if (!ref) return { song, id: barId };
  const bar = emptyBar();
  const s = song.sections[ref.section]!;
  const bars = [...s.bars];
  bars.splice(ref.bar + (before ? 0 : 1), 0, bar);
  return { song: mapSection(song, s.id, (x) => ({ ...x, bars })), id: bar.id };
}

/** A section keeps at least one bar; deleting the section is a separate, explicit act. */
export function deleteBar(song: Song, barId: string): Song {
  const ref = findBar(song, barId);
  if (!ref) return song;
  const s = song.sections[ref.section]!;
  if (s.bars.length <= 1) return song;
  return mapSection(song, s.id, (x) => ({ ...x, bars: x.bars.filter((b) => b.id !== barId) }));
}

/**
 * Two key changes, both from the key menu. **Transpose** (his ruling, decision 2) moves everything,
 * and since chords are stored relative to the key, that is just setting it. **Set key** keeps every
 * chord as written: it is for a key that was set wrong before the chords were typed.
 */
export function transpose(song: Song, to: Key): Song {
  return { ...song, key: to };
}

export function setKeyKeepChords(song: Song, to: Key): Song {
  if (sameKey(song.key, to)) return song;
  const from = song.key;
  return {
    ...song,
    key: to,
    sections: song.sections.map((s) => ({
      ...s,
      bars: s.bars.map((b) => ({
        ...b,
        chords: b.chords.map((c) => ({ ...c, chord: c.chord ? rekeyChord(c.chord, from, to) : null })),
      })),
    })),
  };
}

export function setPatterns(song: Song, patterns: Pattern[]): Song {
  return { ...song, patterns: [...builtinPatterns(), ...patterns.filter((p) => p.id !== SLASHES_ID && p.id !== "beats")] };
}

/** Deleting a pattern sends whoever used it back to Slashes, not to a dangling id. */
export function deletePattern(song: Song, id: string): Song {
  return {
    ...song,
    patterns: song.patterns.filter((p) => p.id !== id),
    sections: song.sections.map((s) => ({
      ...s,
      pattern: s.pattern === id ? SLASHES_ID : s.pattern,
      bars: s.bars.map((b) => {
        if (b.pattern !== id) return b;
        const { pattern: _drop, ...rest } = b;
        return rest;
      }),
    })),
  };
}

/**
 * Changing the meter keeps every chord where it was, counted in ticks from the bar's start. A chord
 * that would now fall past the bar's end (beat 4 of 4/4 going to 3/4) moves to the new last beat,
 * where it is still seen. Dropping it would lose his work, and keeping it unseen would leave the
 * page lying (non-negotiables 3, 4). **Inference**: he has not ruled on meter changes.
 */
export function setTime(song: Song, time: TimeSig): Song {
  const total = barTicks(time);
  const last = total - beatTicks(time);
  return {
    ...song,
    time,
    sections: song.sections.map((s) => ({
      ...s,
      bars: s.bars.map((b) => {
        if (b.chords.every((c) => c.tick < total)) return b;
        const kept = b.chords.filter((c) => c.tick < last);
        const moved = b.chords.filter((c) => c.tick >= last);
        const lastChord = moved[moved.length - 1];
        return { ...b, chords: lastChord ? [...kept, { ...lastChord, tick: last }] : kept };
      }),
    })),
  };
}

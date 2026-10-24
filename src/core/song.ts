/**
 * The chart, as data (non-negotiable 3). Every edit is a pure function from Song to Song, so undo
 * is a stack of values and the page is always compiled from one of them.
 */
import { chordsFromCells, parseBar, rekeyChord, type BarChord } from "./chord";
import { DEFAULT_TONIC_OCTAVE, barContexts, keyChangeTo, type KeyChange } from "./context";
import { restBar, rekeyRuns, writeAt, type NoteRun } from "./notes";
import { KEYS, mod, sameKey, type Key } from "./pitch";
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
  /** This bar's own rhythm, as pattern text, clicked in the step grid (decision 6). Wins over any
   * pattern. */
  rhythm?: string;
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
  /** A key change from this bar on (decision 7), stored relative to the song's key. */
  keyChange?: KeyChange;
  /** A meter change from this bar on. */
  timeChange?: TimeSig;
  /** A tempo change from this bar on, ♩ = n. */
  tempoChange?: number;
  /** Written notes instead of slashes (decision 8). They sum to the bar. */
  notes?: NoteRun[];
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
  /** The octave of the song's tonic, for written notes. Absent means 4. Transposing moves it to
   * the nearer tonic, so notes go to the nearer register. */
  tonicOctave?: number;
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
  // Transposing keeps the mode: C major to A minor would change what every chord means. The key
  // menu offers only the song's own mode under Transpose (§7.2).
  const key: Key = { tonic: to.tonic, mode: song.key.mode };
  return { ...song, key, tonicOctave: nearerOctave(song, key) };
}

/**
 * The octave of the new tonic nearer the old one, by letters: up if the new letter is at most 3
 * letters above, else down. Letter distance (not semitones) makes there-and-back exact: B→F is down
 * an augmented 4th, and F→B is up the same, never an octave's drift.
 */
function nearerOctave(song: Song, to: Key): number {
  const oct = song.tonicOctave ?? DEFAULT_TONIC_OCTAVE;
  const from = oct * 7 + song.key.tonic.letter;
  const d = mod(to.tonic.letter - song.key.tonic.letter, 7);
  const step = d <= 3 ? from + d : from - (7 - d);
  return Math.floor(step / 7);
}

/**
 * Set key, keep chords: the chart is re-read in a new key with everything sounding as written.
 * Chords, key changes and notes keep their pitches; only what they are relative to moves.
 */
export function setKeyKeepChords(song: Song, to: Key): Song {
  if (sameKey(song.key, to)) return song;
  const before = barContexts(song);
  const keyed: Song = { ...song, key: to, tonicOctave: nearerOctave(song, to) };
  const withChanges: Song = {
    ...keyed,
    sections: keyed.sections.map((s) => ({
      ...s,
      bars: s.bars.map((b) => (b.keyChange ? { ...b, keyChange: keyChangeTo(keyed, before.get(b.id)!.key) } : b)),
    })),
  };
  const after = barContexts(withChanges);
  return {
    ...withChanges,
    sections: withChanges.sections.map((s) => ({
      ...s,
      bars: s.bars.map((b) => {
        const from = before.get(b.id)!;
        const toCtx = after.get(b.id)!;
        const next: Bar = {
          ...b,
          chords: b.chords.map((c) => ({ ...c, chord: c.chord ? rekeyChord(c.chord, from.key, toCtx.key) : null })),
        };
        if (b.notes) next.notes = rekeyRuns(b.notes, from, toCtx);
        return next;
      }),
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
 * page lying (non-negotiables 3, 4). **Inference**: he has not ruled on meter changes. Written notes
 * are cut at the new barline, or filled out with rest (non-negotiable 1).
 */
export function setTime(song: Song, time: TimeSig): Song {
  return fitToMeters({ ...song, time });
}

/** Every bar made to fit the meter in force there. */
export function fitToMeters(song: Song): Song {
  const ctx = barContexts(song);
  return {
    ...song,
    sections: song.sections.map((s) => ({
      ...s,
      bars: s.bars.map((b) => {
        const time = ctx.get(b.id)!.time;
        const total = barTicks(time);
        const last = total - beatTicks(time);
        let out = b;
        if (!b.chords.every((c) => c.tick < total)) {
          const kept = b.chords.filter((c) => c.tick < last);
          const moved = b.chords.filter((c) => c.tick >= last);
          const lastChord = moved[moved.length - 1];
          out = { ...out, chords: lastChord ? [...kept, { ...lastChord, tick: last }] : kept };
        }
        if (b.notes && b.notes.reduce((a, r) => a + r.ticks, 0) !== total) {
          let runs: NoteRun[] = restBar(time);
          let t = 0;
          for (const r of b.notes) {
            if (t >= total) break;
            if (!r.rest) runs = writeAt(runs, time, t, Math.min(r.ticks, total - t), r.pitches).runs;
            t += r.ticks;
          }
          out = { ...out, notes: runs };
        }
        return out;
      }),
    })),
  };
}

/** Key change at a bar: `null` removes it. A change to the key already in force is no change. */
export function setKeyChange(song: Song, barId: string, to: Key | null): Song {
  return updateBar(song, barId, { keyChange: to ? keyChangeTo(song, to) : undefined });
}

export function setTimeChange(song: Song, barId: string, to: TimeSig | null): Song {
  return fitToMeters(updateBar(song, barId, { timeChange: to ?? undefined }));
}

/**
 * A meter for the selected bars only: the change at the first, and the meter before it restored
 * after the last, unless that bar already has a change of its own. An odd bar of 2/4 in a 4/4 song
 * is the common case, and it should not take the rest of the song with it. **Inference.**
 */
export function setTimeForBars(song: Song, ids: readonly string[], to: TimeSig): Song {
  const first = ids[0];
  const last = ids[ids.length - 1];
  if (!first || !last) return song;
  const ctx = barContexts(song);
  const before = ctx.get(first)!.prevTime;
  // Picking the meter already in force before the selection means "no change here" (decision 10's
  // sweep: it stored a change that changed nothing).
  if (before.beats === to.beats && before.unit === to.unit) return clearTimeForBars(song, ids);
  const flat = allBars(song);
  const after = flat[flat.findIndex((x) => x.bar.id === last) + 1]?.bar;
  let s = updateBar(song, first, { timeChange: to });
  for (const id of ids.slice(1)) s = updateBar(s, id, { timeChange: undefined });
  if (after && !after.timeChange && (before.beats !== to.beats || before.unit !== to.unit)) s = updateBar(s, after.id, { timeChange: before });
  return fitToMeters(s);
}

/**
 * Removes the selection's meter change, and the change back after it if that is the one
 * `setTimeForBars` put there. The sweep found the × leaving that one behind: harmless on the page,
 * but a change nobody made, which turned up again in exports.
 */
export function clearTimeForBars(song: Song, ids: readonly string[]): Song {
  const first = ids[0];
  const last = ids[ids.length - 1];
  if (!first || !last) return song;
  const before = barContexts(song).get(first)!.prevTime;
  const flat = allBars(song);
  const after = flat[flat.findIndex((x) => x.bar.id === last) + 1]?.bar;
  let s = updateBar(song, first, { timeChange: undefined });
  if (after?.timeChange && after.timeChange.beats === before.beats && after.timeChange.unit === before.unit) {
    s = updateBar(s, after.id, { timeChange: undefined });
  }
  return fitToMeters(s);
}

export function setTempoChange(song: Song, barId: string, to: number | null): Song {
  return updateBar(song, barId, { tempoChange: to ?? undefined });
}

export function setBarNotes(song: Song, barId: string, runs: NoteRun[] | null): Song {
  return updateBar(song, barId, { notes: runs ?? undefined });
}

/*
 * Range edits (decision 5). The editor works on a selection of bars, as iReal Pro's does: one
 * press applies to every selected bar, rather than one press per bar.
 */

/** The bars from `a` to `b` inclusive, in reading order, whichever comes first. */
export function barRange(song: Song, a: string, b: string): string[] {
  const ids = allBars(song).map((x) => x.bar.id);
  const i = ids.indexOf(a);
  const j = ids.indexOf(b);
  if (i < 0 || j < 0) return [];
  return ids.slice(Math.min(i, j), Math.max(i, j) + 1);
}

export function updateBars(song: Song, ids: readonly string[], patch: Partial<Omit<Bar, "id">>): Song {
  return ids.reduce((s, id) => updateBar(s, id, patch), song);
}

export function clearChords(song: Song, ids: readonly string[]): Song {
  return updateBars(song, ids, { chords: [] });
}

/**
 * Repeat signs for a selection: |: on its first bar and :| on its last. Off removes both. Selecting
 * the four bars and pressing once is the whole gesture.
 */
export function setRepeat(song: Song, ids: readonly string[], on: boolean, times = 2): Song {
  const first = ids[0];
  const last = ids[ids.length - 1];
  if (!first || !last) return song;
  let s = updateBar(song, first, { repeatStart: on ? true : undefined });
  s = updateBar(s, last, { repeatEnd: on ? { times } : undefined });
  return s;
}

/** An ending number for every selected bar. If every one already has it, it comes off all of them. */
export function toggleEnding(song: Song, ids: readonly string[], n: number): Song {
  const bars = ids.map((id) => {
    const r = findBar(song, id);
    return r ? song.sections[r.section]!.bars[r.bar]! : undefined;
  });
  const allHave = bars.every((b) => b?.ending?.includes(n));
  return ids.reduce((s, id, i) => {
    const cur = bars[i]?.ending ?? [];
    const next = allHave ? cur.filter((x) => x !== n) : [...new Set([...cur, n])].sort((a, b) => a - b);
    return updateBar(s, id, { ending: next });
  }, song);
}

/** Deletes the selected bars, keeping at least one bar in each section they touch. */
/**
 * Deletes the selected bars. A section whose every bar is selected goes as a whole, rather than
 * leaving one empty bar behind (the sweep: selecting a section in Form and pressing Delete left a
 * stub). The chart always keeps at least one section.
 */
export function deleteBars(song: Song, ids: readonly string[]): Song {
  const chosen = new Set(ids);
  const whole = song.sections.filter((s) => s.bars.every((b) => chosen.has(b.id)));
  const keep = whole.length === song.sections.length ? whole.slice(1) : whole;
  const gone = new Set(keep.map((s) => s.id));
  const pruned: Song = { ...song, sections: song.sections.filter((s) => !gone.has(s.id)) };
  return ids.reduce((s, id) => deleteBar(s, id), pruned);
}

/** A section's bar count, set from the Form panel: adds empty bars at the end, or removes from it. */
export function setBarCount(song: Song, sectionId: string, n: number): Song {
  const count = Math.max(1, Math.min(64, Math.round(n)));
  return {
    ...song,
    sections: song.sections.map((s) => {
      if (s.id !== sectionId || s.bars.length === count) return s;
      if (s.bars.length > count) return { ...s, bars: s.bars.slice(0, count) };
      return { ...s, bars: [...s.bars, ...Array.from({ length: count - s.bars.length }, emptyBar)] };
    }),
  };
}

/** What ⌘C takes: each bar's chords, rhythm and cues, but not its repeat signs or endings. Those
 * belong to where a bar sits in the form, not to its music. */
export type BarClip = Pick<Bar, "chords" | "pattern" | "rhythm" | "cueAbove" | "cueBelow" | "notes">;

export function copyBars(song: Song, ids: readonly string[]): BarClip[] {
  return ids.flatMap((id) => {
    const r = findBar(song, id);
    if (!r) return [];
    const sec = song.sections[r.section]!;
    const b = sec.bars[r.bar]!;
    // The rhythm the bar draws, not only its override: Melody's slashes pasted into a strummed
    // Chorus came out strummed when only overrides were copied (found driving it).
    const clip: BarClip = { chords: structuredClone(b.chords), pattern: barPatternId(sec, b) };
    if (b.rhythm) clip.rhythm = b.rhythm;
    if (b.notes) clip.notes = structuredClone(b.notes);
    if (b.cueAbove) clip.cueAbove = b.cueAbove;
    if (b.cueBelow) clip.cueBelow = b.cueBelow;
    return [clip];
  });
}

/** ⌘V: overwrites bars from `startId` on, in reading order, and stops at the end of the chart.
 * Returns the ids written, so the editor can select them. */
export function pasteBars(song: Song, startId: string, clips: readonly BarClip[]): { song: Song; ids: string[] } {
  const ids = allBars(song).map((x) => x.bar.id);
  const i = ids.indexOf(startId);
  if (i < 0) return { song, ids: [] };
  const target = ids.slice(i, i + clips.length);
  const next = target.reduce(
    (s, id, k) =>
      updateBar(s, id, {
        chords: structuredClone(clips[k]!.chords),
        // An override only where the destination section would draw something else.
        pattern: clips[k]!.pattern === s.sections[findBar(s, id)!.section]!.pattern ? undefined : clips[k]!.pattern,
        rhythm: clips[k]!.rhythm,
        notes: clips[k]!.notes ? structuredClone(clips[k]!.notes) : undefined,
        cueAbove: clips[k]!.cueAbove,
        cueBelow: clips[k]!.cueBelow,
      }),
    song,
  );
  return { song: next, ids: target };
}

/**
 * The step grid's result for the selected bars (decision 6). If the clicked rhythm is exactly a
 * named pattern, the bars use that pattern, as if its chip had been pressed. Otherwise each bar gets
 * it as its own rhythm. Either way the bars' other rhythm settings go, so what is drawn is what was
 * clicked.
 */
export function setBarsRhythm(song: Song, ids: readonly string[], text: string): Song {
  const named = song.patterns.find((p) => p.text !== "" && p.text === text);
  return ids.reduce((s, id) => {
    const r = findBar(s, id);
    if (!r) return s;
    const sec = s.sections[r.section]!;
    // A rhythm makes the bar a slash bar again: notes written before decision 9 can only be cleared
    // this way now that note entry is gone (the sweep found such a bar had no way back).
    if (named) return updateBar(s, id, { rhythm: undefined, notes: undefined, pattern: named.id === sec.pattern ? undefined : named.id });
    return updateBar(s, id, { rhythm: text, notes: undefined });
  }, song);
}

/** A pattern chip: the bars use the pattern and drop any rhythm of their own. A whole section
 * selected sets the section's pattern instead, with no overrides. */
export function setBarsPattern(song: Song, ids: readonly string[], patternId: string): Song {
  const chosen = new Set(ids);
  let out = song;
  for (const sec of song.sections) {
    const mine = sec.bars.filter((b) => chosen.has(b.id)).map((b) => b.id);
    if (mine.length === 0) continue;
    if (mine.length === sec.bars.length) {
      out = updateSection(out, sec.id, { pattern: patternId });
      out = updateBars(out, mine, { pattern: undefined, rhythm: undefined, notes: undefined });
    } else {
      out = updateBars(out, mine, { pattern: patternId === sec.pattern ? undefined : patternId, rhythm: undefined, notes: undefined });
    }
  }
  return out;
}

/** "Save as pattern": the bars' own rhythm becomes a named pattern, and they use it. */
export function saveRhythmAsPattern(song: Song, ids: readonly string[], name: string, text: string): { song: Song; id: string } {
  const id = newId("p");
  const withPattern: Song = { ...song, patterns: [...song.patterns, { id, name, text }] };
  return { song: setBarsRhythm(withPattern, ids, text), id };
}

/** Editing a named pattern in the Patterns menu changes every bar that uses it. */
export function updatePatternText(song: Song, id: string, text: string): Song {
  return { ...song, patterns: song.patterns.map((p) => (p.id === id ? { ...p, text } : p)) };
}

/** `key` is the key the chords were typed in: the bar's own, or a part's (Part view, decision 7).
 * Chords are stored as degrees, so the same degrees are right in the concert key too. */
export function setBarCells(song: Song, barId: string, cells: readonly string[], cellTicks: number, key: Key): { song: Song; error?: { cell: number; text: string } } {
  const prev = previousBar(song, barId)?.chords ?? [];
  const p = chordsFromCells(cells, cellTicks, key, prev);
  if (!p.ok) return { song, error: { cell: p.cell, text: p.error } };
  return { song: updateBar(song, barId, { chords: p.chords }) };
}

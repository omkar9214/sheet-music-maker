/**
 * Slash rhythm as pattern stamps (decision 3). A pattern is one bar of durations typed as
 * `8 8 r16 8 8 8 r16 4`, and every bar draws either its own pattern or its section's.
 *
 * Non-negotiable 1: a pattern that does not sum to the bar exactly is refused, and the refusal
 * names the shortfall. It is never drawn as an overfull bar.
 */
import { chordSpans, type BarChord } from "./chord";
import { PPQ, barTicks, beatTicks, isCompound, type TimeSig } from "./ticks";

export interface RhythmEvent {
  ticks: number;
  rest: boolean;
  /** Tied to the next event: one strum that rings across a beat, notated as two values. */
  tie?: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  /** Durations: 1 2 4 8 16 32, a `.` for dotted, an `r` for a rest, a `~` for tied to the next. */
  text: string;
}

/**
 * Built-in. Slashes is one slash per chord, the PDF's bars 13–16. It has no text because it is
 * computed from the chords. Beats is one slash per beat, and it is also what a bar falls back to
 * when its pattern no longer fits after a time-signature change.
 */
export const SLASHES_ID = "slashes";
export const BEATS_ID = "beats";

export function builtinPatterns(): Pattern[] {
  return [
    { id: SLASHES_ID, name: "Slashes", text: "" },
    { id: BEATS_ID, name: "Beats", text: "" },
  ];
}

/**
 * The two rhythms in *Khwabon ke Parindey*, read off a 400-dpi render of the PDF, bars 1 and 22.
 * Strum: two 8ths beamed, a 16th rest, three 8ths beamed, a 16th rest, a quarter, which is
 * 4+1+6+1+4 = 16 sixteenths. Choke: two 8ths, a 16th rest, two 8ths, an 8th rest, a 16th rest, a
 * quarter rest, which is 4+1+4+2+1+4 = 16. They are what a new 4/4 chart starts with, because they
 * are his.
 */
export function starterPatterns(): Pattern[] {
  return [
    { id: "strum", name: "Strum", text: "8 8 r16 8 8 8 r16 4" },
    { id: "choke", name: "Choke", text: "8 8 r16 8 8 r8 r16 r4" },
  ];
}

export type PatternParse = { ok: true; events: RhythmEvent[] } | { ok: false; error: string };

const VALUES = new Set([1, 2, 4, 8, 16, 32]);

export function durationTicks(value: number, dotted: boolean): number {
  const t = (PPQ * 4) / value;
  return dotted ? t + t / 2 : t;
}

/** The shortfall or excess, as a fraction of a whole note, e.g. "short 1/16". */
function fractionText(ticks: number): string {
  const whole = PPQ * 4;
  let n = ticks;
  let d = whole;
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const k = g(n, d);
  n /= k;
  d /= k;
  return `${n}/${d}`;
}

export function parsePattern(text: string, ts: TimeSig): PatternParse {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: "empty" };
  const events: RhythmEvent[] = [];
  for (const tok of tokens) {
    const m = /^(r?)(\d+)(\.?)(~?)$/i.exec(tok);
    const value = m ? Number(m[2]) : NaN;
    if (!m || !VALUES.has(value) || (m[1] && m[4])) return { ok: false, error: `"${tok}" is not a duration` };
    const e: RhythmEvent = { ticks: durationTicks(value, m[3] === "."), rest: m[1] !== "" };
    if (m[4]) e.tie = true;
    events.push(e);
  }
  if (events[events.length - 1]?.tie) return { ok: false, error: "tied past the bar" };
  const sum = events.reduce((a, e) => a + e.ticks, 0);
  const bar = barTicks(ts);
  if (sum < bar) return { ok: false, error: `short ${fractionText(bar - sum)}` };
  if (sum > bar) return { ok: false, error: `over by ${fractionText(sum - bar)}` };
  return { ok: true, events };
}

export function beatEvents(ts: TimeSig): RhythmEvent[] {
  const n = barTicks(ts) / beatTicks(ts);
  return Array.from({ length: n }, () => ({ ticks: beatTicks(ts), rest: false }));
}

/** What a bar draws: `stemless` is the Slashes kind, hollow and with no stems, as the PDF draws it. */
export interface BarRhythm {
  events: RhythmEvent[];
  stemless: boolean;
  /** True when the bar's pattern does not fit this meter and Beats is drawn instead. */
  fellBack: boolean;
}

export function barRhythm(
  pattern: Pattern | undefined,
  chords: readonly BarChord[],
  ts: TimeSig,
  /** The bar's own rhythm (decision 6), which wins over any pattern. */
  own?: string,
): BarRhythm {
  if (own) {
    const p = parsePattern(own, ts);
    if (p.ok) return { events: p.events, stemless: false, fellBack: false };
    return { events: beatEvents(ts), stemless: false, fellBack: true };
  }
  if (!pattern || pattern.id === SLASHES_ID) {
    return {
      events: chordSpans(chords, ts).map((ticks) => ({ ticks, rest: false })),
      stemless: true,
      fellBack: false,
    };
  }
  if (pattern.id === BEATS_ID) return { events: beatEvents(ts), stemless: false, fellBack: false };
  const p = parsePattern(pattern.text, ts);
  if (!p.ok) return { events: beatEvents(ts), stemless: false, fellBack: true };
  return { events: p.events, stemless: false, fellBack: false };
}

/**
 * Where beams may not cross. Elaine Gould, *Behind Bars*, "Beaming": in 4/4 8ths are beamed in half
 * bars, in 3/4 and 2/4 by the beat, and in compound time by the dotted beat.
 *
 * **Inference, matched to the reference:** a boundary breaks a beam only when a note *starts* on it.
 * MuseScore beamed the strum's three 8ths across the middle of the bar because the second one
 * straddles beat 3. That is in bars 1–4 of the PDF, and this rule reproduces it.
 */
export function beamBoundary(ts: TimeSig): number {
  if (ts.unit === 4 && ts.beats === 4) return PPQ * 2;
  if (isCompound(ts)) return beatTicks(ts);
  return beatTicks(ts);
}

/** Beam groups as index ranges [start, end] inclusive, each holding at least two notes. */
export function beamGroups(events: readonly RhythmEvent[], ts: TimeSig): Array<[number, number]> {
  const boundary = beamBoundary(ts);
  const groups: Array<[number, number]> = [];
  let start = -1;
  let tick = 0;
  const close = (end: number) => {
    if (start >= 0 && end > start) groups.push([start, end]);
    start = -1;
  };
  events.forEach((e, i) => {
    const beamable = !e.rest && e.ticks < PPQ;
    if (!beamable) close(i - 1);
    else if (start < 0) start = i;
    else if (tick % boundary === 0) {
      close(i - 1);
      start = i;
    }
    tick += e.ticks;
  });
  close(events.length - 1);
  return groups;
}

export function onsets(events: readonly RhythmEvent[]): number[] {
  let t = 0;
  return events.map((e) => {
    const at = t;
    t += e.ticks;
    return at;
  });
}

/*
 * The step grid (decision 6). Omkar: *"Need to be able to change the rhythm"*. A strummer thinks in
 * strums on "1 e & a", not in note values. So a bar's rhythm is edited as 16th-note steps, each a
 * strum, a ring (the strum before it carries on) or silence. Notation is computed from the steps,
 * never typed.
 */

export type Step = "hit" | "hold" | "rest";
export const STEP_TICKS = PPQ / 4;

/** A pattern as steps, or null if it holds a value the grid cannot show (a 32nd, a dotted 16th). */
export function gridFromEvents(events: readonly RhythmEvent[], ts: TimeSig): Step[] | null {
  const steps: Step[] = [];
  let tiedIn = false;
  for (const e of events) {
    if (e.ticks % STEP_TICKS !== 0) return null;
    const n = e.ticks / STEP_TICKS;
    for (let i = 0; i < n; i++) steps.push(e.rest ? "rest" : i === 0 && !tiedIn ? "hit" : "hold");
    tiedIn = !e.rest && !!e.tie;
  }
  return steps.length * STEP_TICKS === barTicks(ts) ? steps : null;
}

/** Lengths in steps that are one written value: 16th, 8th, dotted 8th, quarter, dotted quarter,
 * half, dotted half, whole. */
const WRITABLE = new Set([1, 2, 3, 4, 6, 8, 12, 16]);

/** Steps per beat, and the boundary a long note may not cross unless it starts the bar. */
function grid(ts: TimeSig) {
  const beat = beatTicks(ts) / STEP_TICKS;
  const total = barTicks(ts) / STEP_TICKS;
  const half = ts.unit === 4 && ts.beats === 4 ? 8 : total;
  return { beat, total, half };
}

/**
 * One strum of `len` steps from `start`, as written values tied together. **Inference**, aimed at
 * what a reader expects and checked against his PDF:
 * - 8ths and 16ths stay single even across a beat. His Strum's middle 8th straddles beat 3, and the
 *   PDF writes it as one 8th.
 * - A writable value inside one beat stays single (a dotted 8th on the "e").
 * - A value that starts on a beat stays single if it is writable and does not cross the middle of
 *   a 4/4 bar, unless it starts the bar.
 * - A quarter on an off-beat 8th inside a half bar stays single: the "8 4 8" syncopation.
 * - Anything else splits at the next beat and ties across it.
 */
function writeNote(start: number, len: number, ts: TimeSig): number[] {
  const { beat, half } = grid(ts);
  const end = start + len;
  const crossesHalf = start < half && end > half && start !== 0;
  if (WRITABLE.has(len)) {
    if (len <= 2) return [len];
    // Inside one beat: the "16 8." snap and its kin read at a glance.
    if (Math.floor(start / beat) === Math.floor((end - 1) / beat)) return [len];
    if (start % beat === 0 && !crossesHalf) return [len];
    if (len === 4 && start % 2 === 0 && !crossesHalf && beat === 4) return [len];
  }
  const next = (Math.floor(start / beat) + 1) * beat;
  if (next >= end) {
    // Inside one beat and not writable as one value (a 5 in a 6-step beat): largest first.
    const first = [...WRITABLE].filter((w) => w < len).sort((a, b) => b - a)[0]!;
    return [first, ...writeNote(start + first, len - first, ts)];
  }
  return [...writeNote(start, next - start, ts), ...writeNote(next, end - next, ts)];
}

/**
 * Silence from `start` for `len` steps, as rests that show the beat: split at every beat, except a
 * whole-bar rest and a half rest on beat 1 or 3 of 4/4. Inside a beat, a 16th first if it starts
 * on an "e" or an "a", then 8ths. This is the textbook convention as remembered (Gould, *Behind
 * Bars*, on rests). It is not checked against the book.
 */
function writeRest(start: number, len: number, ts: TimeSig): number[] {
  const { beat, total } = grid(ts);
  if (start === 0 && len === total) return [len];
  if (beat === 4 && total === 16 && len >= 8 && start % 8 === 0) return [8, ...(len > 8 ? writeRest(start + 8, len - 8, ts) : [])];
  const out: number[] = [];
  let s = start;
  const end = start + len;
  while (s < end) {
    const beatEnd = Math.min(end, (Math.floor(s / beat) + 1) * beat);
    if (s % beat === 0 && beatEnd - s === beat && WRITABLE.has(beat)) {
      out.push(beat);
      s = beatEnd;
      continue;
    }
    while (s < beatEnd) {
      const w = s % 2 === 1 || beatEnd - s < 2 ? 1 : 2;
      out.push(w);
      s += w;
    }
  }
  return out;
}

/** Steps back to written values. Steps before the first strum are silence. */
export function eventsFromGrid(steps: readonly Step[], ts: TimeSig): RhythmEvent[] {
  const runs: Array<{ start: number; len: number; rest: boolean }> = [];
  steps.forEach((st, i) => {
    const cur = runs[runs.length - 1];
    const rest = st === "rest" || (st === "hold" && (!cur || cur.rest));
    if (st === "hit" || !cur || cur.rest !== rest) runs.push({ start: i, len: 1, rest });
    else cur.len++;
  });
  const out: RhythmEvent[] = [];
  for (const r of runs) {
    const parts = r.rest ? writeRest(r.start, r.len, ts) : writeNote(r.start, r.len, ts);
    parts.forEach((p, k) => {
      const e: RhythmEvent = { ticks: p * STEP_TICKS, rest: r.rest };
      if (!r.rest && k < parts.length - 1) e.tie = true;
      out.push(e);
    });
  }
  return out;
}

const NAMES = new Map<number, string>([
  [PPQ * 4, "1"], [PPQ * 3, "2."], [PPQ * 2, "2"], [PPQ * 1.5, "4."], [PPQ, "4"],
  [PPQ * 0.75, "8."], [PPQ / 2, "8"], [PPQ * 0.375, "16."], [PPQ / 4, "16"], [PPQ / 8, "32"],
]);

/** Events as pattern text, the inverse of parsePattern. */
export function eventsText(events: readonly RhythmEvent[]): string {
  return events
    .map((e) => {
      const n = NAMES.get(e.ticks);
      if (!n) throw new Error(`no written value for ${e.ticks} ticks`);
      return (e.rest ? "r" : "") + n + (e.tie ? "~" : "");
    })
    .join(" ");
}

export function textFromGrid(steps: readonly Step[], ts: TimeSig): string {
  return eventsText(eventsFromGrid(steps, ts));
}

/** The grid a bar shows: its own rhythm, else its pattern, else Slashes' one long note per chord. */
export function gridOfRhythm(r: BarRhythm, ts: TimeSig): Step[] {
  return gridFromEvents(r.events, ts) ?? gridFromEvents(beatEvents(ts), ts) ?? [];
}

/** "1 e & a 2 e & a …" under the steps; in compound time "1 & a & a &". */
export function stepCounts(ts: TimeSig): string[] {
  const { beat, total } = grid(ts);
  const sub = beat === 6 ? ["", "", "&", "", "a", ""] : ["", "e", "&", "a"];
  return Array.from({ length: total }, (_, i) => (i % beat === 0 ? String(i / beat + 1) : sub[i % beat] ?? ""));
}

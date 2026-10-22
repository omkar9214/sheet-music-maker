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
}

export interface Pattern {
  id: string;
  name: string;
  /** Durations: 1 2 4 8 16 32, a `.` for dotted, an `r` for a rest. */
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
    const m = /^(r?)(\d+)(\.?)$/i.exec(tok);
    const value = m ? Number(m[2]) : NaN;
    if (!m || !VALUES.has(value)) return { ok: false, error: `"${tok}" is not a duration` };
    events.push({ ticks: durationTicks(value, m[3] === "."), rest: m[1] !== "" });
  }
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
): BarRhythm {
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

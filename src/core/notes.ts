/**
 * **Dormant since decision 9** (*"Remove the notes feature for now, It's getting complicated"*):
 * nothing in the editor writes notes any more. The model, its drawing and its MusicXML export stay,
 * so a chart that already holds notes still shows them, and the feature comes back by re-adding the
 * palette and keys from commit 009af0b.
 *
 * Written notes (decision 8): Omkar asked for musical notes, not text. A bar can hold notes instead of
 * slashes: a riff, the band's hits, a melody line.
 *
 * Stored as **runs**, one per note as entered or per stretch of silence. A run may be any number of
 * 16ths long, and the page splits it into written values and ties (`rhythm.writtenParts`), as the
 * step grid does. Pitches are relative to the key in force at the bar (`context.ts`), so notes
 * transpose with the chart and keep their spelling by letter (non-negotiable 2). Non-negotiable 1:
 * a bar's runs always sum to the bar, which every edit here keeps.
 */
import { midiOf, type BarContext } from "./context";
import { accidentalBetween, mod, naturalPc, type Key } from "./pitch";
import { STEP_TICKS, writtenParts } from "./rhythm";
import { barTicks, type TimeSig } from "./ticks";

/** A pitch as diatonic steps and semitones above the local tonic (at its octave). */
export interface NotePitch {
  steps: number;
  semis: number;
}

export interface NoteRun {
  ticks: number;
  rest: boolean;
  /** Tied into the next run (which must be a note). */
  tie?: boolean;
  /** Lowest first. Empty for a rest. */
  pitches: NotePitch[];
}

/** A pitch on the page: letter, accidental, octave. */
export interface Written {
  letter: number;
  acc: number;
  octave: number;
}

export function stepOf(w: Written): number {
  return w.octave * 7 + w.letter;
}

export function writtenOf(p: NotePitch, ctx: Pick<BarContext, "tonicStep" | "tonicMidi">): Written {
  const step = ctx.tonicStep + p.steps;
  const letter = mod(step, 7);
  const octave = Math.floor(step / 7);
  const midi = ctx.tonicMidi + p.semis;
  return { letter, octave, acc: midi - midiOf(letter, 0, octave) };
}

export function pitchOf(w: Written, ctx: Pick<BarContext, "tonicStep" | "tonicMidi">): NotePitch {
  return { steps: stepOf(w) - ctx.tonicStep, semis: midiOf(w.letter, w.acc, w.octave) - ctx.tonicMidi };
}

export function midiOfWritten(w: Written): number {
  return midiOf(w.letter, w.acc, w.octave);
}

/** The key signature's accidental on `letter`: C in B major is C♯. */
export function signatureAcc(letter: number, key: Key): number {
  // The scale of the key: walk the major (or natural minor) steps from the tonic.
  const major = [0, 2, 4, 5, 7, 9, 11];
  const minor = [0, 2, 3, 5, 7, 8, 10];
  const scale = key.mode === "major" ? major : minor;
  const deg = mod(letter - key.tonic.letter, 7);
  const tonicPc = naturalPc(key.tonic.letter) + key.tonic.acc;
  return accidentalBetween(mod(tonicPc + scale[deg]!, 12), letter);
}

export function restBar(ts: TimeSig): NoteRun[] {
  return [{ ticks: barTicks(ts), rest: true, pitches: [] }];
}

/** Each run with its start tick. */
export function withStarts(runs: readonly NoteRun[]): Array<NoteRun & { start: number }> {
  let t = 0;
  return runs.map((r) => {
    const out = { ...r, start: t };
    t += r.ticks;
    return out;
  });
}

function mergeRests(runs: NoteRun[]): NoteRun[] {
  const out: NoteRun[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (r.rest && last?.rest) last.ticks += r.ticks;
    else out.push({ ...r, pitches: [...r.pitches] });
  }
  return out;
}

/**
 * Writes `ticks` of `pitches` (or silence, if null) at `at`, over whatever was there, as MuseScore's
 * note input does. A note that started earlier is cut where the new one starts, and anything it
 * covered after is silence. A value running past the barline is cut at it. Returns the runs and
 * where the cursor goes next.
 */
export function writeAt(
  runs: readonly NoteRun[] | undefined,
  ts: TimeSig,
  at: number,
  ticks: number,
  pitches: NotePitch[] | null,
): { runs: NoteRun[]; next: number } {
  const total = barTicks(ts);
  const base = runs && runs.reduce((a, r) => a + r.ticks, 0) === total ? runs : restBar(ts);
  const start = Math.max(0, Math.min(total - STEP_TICKS, Math.round(at / STEP_TICKS) * STEP_TICKS));
  const end = Math.min(total, start + Math.max(STEP_TICKS, ticks));
  const out: NoteRun[] = [];
  for (const r of withStarts(base)) {
    const rEnd = r.start + r.ticks;
    if (rEnd <= start || r.start >= end) {
      out.push({ ticks: r.ticks, rest: r.rest, pitches: r.pitches, ...(r.tie ? { tie: true } : {}) });
      continue;
    }
    if (r.start < start) out.push({ ticks: start - r.start, rest: r.rest, pitches: r.pitches });
    if (r.start <= start) out.push({ ticks: end - start, rest: pitches === null, pitches: pitches ?? [] });
    if (rEnd > end) out.push({ ticks: rEnd - end, rest: true, pitches: [] });
  }
  return { runs: mergeRests(out), next: end };
}

/** The run that starts before `at` and is nearest it: what ⌫ and the accidental keys act on. */
export function runBefore(runs: readonly NoteRun[], at: number): number {
  let idx = -1;
  for (const [i, r] of withStarts(runs).entries()) if (r.start < at && !r.rest) idx = i;
  return idx;
}

export function updateRun(runs: readonly NoteRun[], i: number, patch: Partial<NoteRun>): NoteRun[] {
  const next = runs.map((r, j) => (j === i ? { ...r, ...patch } : r));
  if (patch.rest) next[i] = { ticks: next[i]!.ticks, rest: true, pitches: [] };
  return mergeRests(next);
}

/** The octave for a typed letter: nearest to `near` (the previous note, or the staff's middle). */
export function nearestOctave(letter: number, near: Written): number {
  const target = stepOf(near);
  let best = near.octave;
  for (const o of [near.octave - 1, near.octave, near.octave + 1]) {
    if (Math.abs(o * 7 + letter - target) < Math.abs(best * 7 + letter - target)) best = o;
  }
  return best;
}

/**
 * A semitone up or down, respelled the way a reader expects: toward the key's own note if one is
 * there, else ♯ going up and ♭ going down.
 */
export function shiftSemitone(w: Written, dir: 1 | -1, key: Key): Written {
  const midi = midiOfWritten(w) + dir;
  const candidates: Written[] = [];
  for (const dl of [0, dir, -dir]) {
    const step = stepOf(w) + dl;
    const letter = mod(step, 7);
    const octave = Math.floor(step / 7);
    const acc = midi - midiOf(letter, 0, octave);
    if (Math.abs(acc) <= 2) candidates.push({ letter, octave, acc });
  }
  const inKey = candidates.find((c) => c.acc === signatureAcc(c.letter, key));
  if (inKey) return inKey;
  const plain = candidates.find((c) => c.acc === 0);
  if (plain) return plain;
  return candidates.find((c) => Math.sign(c.acc) === dir) ?? candidates[0] ?? w;
}

/** Which accidentals the page must print, per run per pitch. They carry through the bar for the same
 * letter and octave, starting from the key signature, as in print (Gould, "Accidentals"). */
export function shownAccidentals(runs: readonly NoteRun[], ctx: Pick<BarContext, "tonicStep" | "tonicMidi" | "key">): Array<Array<number | null>> {
  const state = new Map<number, number>();
  return runs.map((r) =>
    r.pitches.map((p) => {
      const w = writtenOf(p, ctx);
      const k = stepOf(w);
      const current = state.get(k) ?? signatureAcc(w.letter, ctx.key);
      state.set(k, w.acc);
      return w.acc === current ? null : w.acc;
    }),
  );
}

/** Transposing keeps every pitch's degree; this re-reads written notes into another key context
 * (Set key, keep notes). */
export function rekeyRuns(runs: readonly NoteRun[], from: BarContext, to: BarContext): NoteRun[] {
  return runs.map((r) => ({ ...r, pitches: r.pitches.map((p) => pitchOf(writtenOf(p, from), to)) }));
}

/** A bar's runs as written values with ties, for the page and for export. Rests are split by the
 * beat; notes as `rhythm.writtenParts` writes them. */
export interface WrittenEvent {
  start: number;
  ticks: number;
  rest: boolean;
  tie: boolean;
  pitches: NotePitch[];
  /** Index of the run this came from, for accidentals and selection. */
  run: number;
}

export function writtenEvents(runs: readonly NoteRun[], ts: TimeSig): WrittenEvent[] {
  const out: WrittenEvent[] = [];
  withStarts(runs).forEach((r, i) => {
    const parts = writtenParts(r.start, r.ticks, r.rest, ts);
    let t = r.start;
    parts.forEach((p, k) => {
      const last = k === parts.length - 1;
      out.push({ start: t, ticks: p, rest: r.rest, tie: !r.rest && (!last || !!r.tie), pitches: r.pitches, run: i });
      t += p;
    });
  });
  return out;
}

/**
 * Exact time (non-negotiable 1). Integer ticks at 960 per quarter, the chord-tone trainer's model:
 * 960 divides by 2, 3, 4, 5, 6, 8, 16 and 64, so a 16th (240), a triplet 8th (320) and a dotted 16th
 * (360) are all whole numbers and a bar sums with `===`, never with an epsilon.
 */
export const PPQ = 960;

export type BeatUnit = 2 | 4 | 8;

export interface TimeSig {
  beats: number;
  unit: BeatUnit;
}

export function barTicks(ts: TimeSig): number {
  return (ts.beats * PPQ * 4) / ts.unit;
}

/**
 * Compound meters count in dotted beats: 6/8 is two beats of three 8ths, not six. The guitar
 * template's "12/8 beat bug" was counting 12 beats there.
 */
export function isCompound(ts: TimeSig): boolean {
  return ts.unit === 8 && ts.beats % 3 === 0 && ts.beats > 3;
}

export function beatTicks(ts: TimeSig): number {
  const unitTicks = (PPQ * 4) / ts.unit;
  return isCompound(ts) ? unitTicks * 3 : unitTicks;
}

export function beatsPerBar(ts: TimeSig): number {
  return barTicks(ts) / beatTicks(ts);
}

export const TIME_SIGS: readonly TimeSig[] = [
  { beats: 4, unit: 4 },
  { beats: 3, unit: 4 },
  { beats: 2, unit: 4 },
  { beats: 2, unit: 2 },
  { beats: 6, unit: 8 },
  { beats: 12, unit: 8 },
];

/**
 * Spelled pitch (non-negotiable 2). A pitch class here is a letter plus an accidental. The semitone
 * is derived from it, never the reverse, so F♯ and G♭ stay different things through every edit and
 * every transposition.
 */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11] as const;

/** `letter` indexes LETTERS. `acc` counts semitones: −2 = 𝄫, −1 = ♭, 0 = ♮, 1 = ♯, 2 = 𝄪. */
export interface Spelled {
  letter: number;
  acc: number;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function pcOf(s: Spelled): number {
  return mod(NATURAL_PC[s.letter]! + s.acc, 12);
}

export function naturalPc(letter: number): number {
  return NATURAL_PC[mod(letter, 7)]!;
}

export function accidentalText(acc: number): string {
  if (acc === 0) return "";
  if (acc === 2) return "𝄪";
  if (acc === -2) return "𝄫";
  return (acc > 0 ? "♯" : "♭").repeat(Math.abs(acc));
}

export function spelledText(s: Spelled): string {
  return LETTERS[s.letter]! + accidentalText(s.acc);
}

/**
 * Reads a root such as `c`, `C#`, `Bb`, `F♯`, `Ebb` from the start of `text`. A lowercase letter is
 * accepted: transcribing at speed is §0's whole point. A `b` straight after the letter is a flat, so
 * `bb7` is B♭7. That is the lead-sheet convention, and there is no other reading of a `b` in that
 * position.
 */
export function readSpelled(text: string): { spelled: Spelled; rest: string } | null {
  const m = /^([A-Ga-g])(𝄪|𝄫|##|bb|♯♯|♭♭|#|b|♯|♭|x)?/.exec(text);
  if (!m) return null;
  const letter = LETTERS.indexOf(m[1]!.toUpperCase() as (typeof LETTERS)[number]);
  const a = m[2] ?? "";
  const acc =
    a === "" ? 0
    : a === "#" || a === "♯" ? 1
    : a === "b" || a === "♭" ? -1
    : a === "##" || a === "♯♯" || a === "x" || a === "𝄪" ? 2
    : -2;
  return { spelled: { letter, acc }, rest: text.slice(m[0].length) };
}

export type Mode = "major" | "minor";

export interface Key {
  tonic: Spelled;
  mode: Mode;
}

/** Sharps (+) or flats (−) in the signature, from the circle of fifths on the major tonic. */
const MAJOR_FIFTHS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F♯": 6, "C♯": 7,
  F: -1, "B♭": -2, "E♭": -3, "A♭": -4, "D♭": -5, "G♭": -6, "C♭": -7,
};

/** The relative major of a minor key: a minor third up, two letters up. */
export function relativeMajor(key: Key): Spelled {
  if (key.mode === "major") return key.tonic;
  const letter = mod(key.tonic.letter + 2, 7);
  const pc = mod(pcOf(key.tonic) + 3, 12);
  return { letter, acc: accidentalBetween(pc, letter) };
}

/** The accidental that makes `letter` sound at `pc`, the nearest way round (−6…+5). */
export function accidentalBetween(pc: number, letter: number): number {
  const d = mod(pc - naturalPc(letter), 12);
  return d > 6 ? d - 12 : d;
}

/** A key with a signature of at most 7 accidentals; E♯ major (11 sharps) is not one. */
export function writable(key: Key): boolean {
  return MAJOR_FIFTHS[spelledText(relativeMajor(key))] !== undefined;
}

/**
 * The writable spelling of a key: itself, or its enharmonic (E♯ → F, F♭ → E). Used where a key change
 * that was written in a playable key lands, after transposing the song, on a theoretical one.
 */
export function writableKey(key: Key): Key {
  if (writable(key)) return key;
  const pc = pcOf(key.tonic);
  for (const d of [1, -1]) {
    const letter = mod(key.tonic.letter + d, 7);
    const k: Key = { tonic: { letter, acc: accidentalBetween(pc, letter) }, mode: key.mode };
    if (writable(k)) return k;
  }
  return key;
}

export function fifths(key: Key): number {
  const f = MAJOR_FIFTHS[spelledText(relativeMajor(key))];
  if (f === undefined) throw new Error(`no signature for ${keyName(key)}`);
  return f;
}

export function keyName(key: Key): string {
  return spelledText(key.tonic) + (key.mode === "minor" ? "m" : "");
}

function k(name: string, mode: Mode): Key {
  const r = readSpelled(name);
  if (!r) throw new Error(name);
  return { tonic: r.spelled, mode };
}

/**
 * The keys the menu offers: every key with a signature of at most 7 accidentals, in circle order. A
 * key outside this list (D♯ major, 9 sharps) cannot be picked, so a transposition can never land on
 * one.
 */
export const KEYS: readonly Key[] = [
  ...["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"].map((n) =>
    k(n, "major"),
  ),
  ...["A", "E", "B", "F#", "C#", "G#", "D#", "A#", "D", "G", "C", "F", "Bb", "Eb", "Ab"].map((n) =>
    k(n, "minor"),
  ),
];

export function sameKey(a: Key, b: Key): boolean {
  return a.mode === b.mode && a.tonic.letter === b.tonic.letter && a.tonic.acc === b.tonic.acc;
}

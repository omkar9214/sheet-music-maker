/**
 * Chord symbols, stored relative to the key.
 *
 * Omkar, decision 2: *"I need to be able to transpose the song. So if the key of the song is in F
 * sharp, if I change the key from F sharp to A, everything should be transposed to A."* A root is
 * stored as a degree: letter steps and semitones above the tonic. Transposing is then changing the
 * key and nothing else. It is lossless (B → A → B gives back the same chart), and the spelling
 * follows the new key's letters. In A, the D♯ of B major becomes C♯, never D♭, and A♯ in C♯ major
 * is B♯ (non-negotiable 2).
 */
import { accidentalBetween, mod, pcOf, readSpelled, spelledText, type Key, type Spelled } from "./pitch";
import { PPQ, barTicks, beatTicks, type TimeSig } from "./ticks";

export interface Degree {
  /** Letters above the tonic letter, 0–6. */
  steps: number;
  /** Semitones above the tonic, 0–11. */
  semis: number;
}

export interface Chord {
  root: Degree;
  /** As typed, with `#`/`b` before a number shown as ♯/♭. Intervals, so it never transposes. */
  quality: string;
  bass?: Degree;
}

/** A chord change inside a bar. `chord: null` is N.C. */
export interface BarChord {
  tick: number;
  chord: Chord | null;
}

export function toDegree(s: Spelled, key: Key): Degree {
  return { steps: mod(s.letter - key.tonic.letter, 7), semis: mod(pcOf(s) - pcOf(key.tonic), 12) };
}

export function fromDegree(d: Degree, key: Key): Spelled {
  const letter = mod(key.tonic.letter + d.steps, 7);
  return { letter, acc: accidentalBetween(mod(pcOf(key.tonic) + d.semis, 12), letter) };
}

export function normaliseQuality(q: string): string {
  return q.replace(/#/g, "♯").replace(/b(?=\d)/g, "♭");
}

/**
 * A quality is a run of known chord-symbol words, numbers and signs. Anything else is a typo, and a
 * refused typo costs a keystroke where a stored one costs a wrong chart. The first version allowed
 * any letters, and the first browser drive stored `Bmaj7e9` (Tab hit before the old text was
 * replaced) as B with quality "maj7e9".
 */
const QUALITY = /^(?:maj|min|mi|m|M|dim|aug|sus|add|alt|omit|no|Δ|ø|°|o|\+|-|\d+|[#♯b♭](?=\d)|\(|\)|\/(?=\d))*$/;

export function parseChord(text: string, key: Key): Chord | null {
  const t = text.trim();
  const root = readSpelled(t);
  if (!root) return null;
  let quality = root.rest;
  let bass: Degree | undefined;
  const slash = quality.lastIndexOf("/");
  // `C6/9` is a quality, not a bass note.
  if (slash >= 0 && !/^\d+$/.test(quality.slice(slash + 1))) {
    const b = readSpelled(quality.slice(slash + 1));
    if (!b || b.rest !== "") return null;
    bass = toDegree(b.spelled, key);
    quality = quality.slice(0, slash);
  }
  if (!QUALITY.test(quality)) return null;
  const chord: Chord = { root: toDegree(root.spelled, key), quality: normaliseQuality(quality) };
  if (bass) chord.bass = bass;
  return chord;
}

export function chordText(c: Chord, key: Key): string {
  return (
    spelledText(fromDegree(c.root, key)) +
    c.quality +
    (c.bass ? "/" + spelledText(fromDegree(c.bass, key)) : "")
  );
}

export function barChordText(bc: BarChord, key: Key): string {
  return bc.chord ? chordText(bc.chord, key) : "N.C.";
}

export type BarParse = { ok: true; chords: BarChord[] } | { ok: false; error: string };

/**
 * One bar's box. Tokens split the bar evenly, so `Bmaj7 C#m11` falls on beats 1 and 3 in 4/4. `.`
 * holds the slot, so `A . . E` puts E on beat 4. `%` repeats `prev`. `NC` is N.C. An empty box is
 * an empty bar. A count that does not divide the bar is refused rather than rounded: 3 chords in 4/4
 * would otherwise land between beats (non-negotiable 1).
 */
export function parseBar(text: string, key: Key, ts: TimeSig, prev: readonly BarChord[] = []): BarParse {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { ok: true, chords: [] };
  if (tokens.length === 1 && tokens[0] === "%") return { ok: true, chords: prev.map((c) => ({ ...c })) };
  const total = barTicks(ts);
  // A slot must be whole half-beats. 960 divides by 3, so "divides the bar" alone would put three
  // chords in 4/4 on triplet halves (found by the test, not by reasoning).
  const half = beatTicks(ts) / 2;
  if (total % tokens.length !== 0 || (total / tokens.length) % half !== 0) {
    return { ok: false, error: `${tokens.length} slots don't divide the bar` };
  }
  const slot = total / tokens.length;
  const chords: BarChord[] = [];
  for (const [i, tok] of tokens.entries()) {
    if (tok === "." || tok === "/") continue;
    if (/^n\.?c\.?$/i.test(tok)) {
      chords.push({ tick: i * slot, chord: null });
      continue;
    }
    const c = parseChord(tok, key);
    if (!c) return { ok: false, error: `"${tok}" is not a chord` };
    chords.push({ tick: i * slot, chord: c });
  }
  if (chords.length > 0 && chords[0]!.tick !== 0) {
    // A bar whose first slot is `.` would start on nothing. Refused for the same reason as an
    // uneven count: what is stored must be what is shown.
    return { ok: false, error: "starts with a hold" };
  }
  return { ok: true, chords };
}

/** The inverse of parseBar: the fewest even slots that put every chord on a slot start. */
export function barText(chords: readonly BarChord[], key: Key, ts: TimeSig): string {
  if (chords.length === 0) return "";
  const total = barTicks(ts);
  for (let n = 1; n <= 16; n++) {
    if (total % n !== 0) continue;
    const slot = total / n;
    if (!chords.every((c) => c.tick % slot === 0)) continue;
    const out: string[] = Array.from({ length: n }, () => ".");
    for (const c of chords) out[c.tick / slot] = barChordText(c, key);
    return out.join(" ");
  }
  return chords.map((c) => barChordText(c, key)).join(" ");
}

/** How long each chord lasts within its bar — the Slashes pattern draws one slash per chord. */
export function chordSpans(chords: readonly BarChord[], ts: TimeSig): number[] {
  const total = barTicks(ts);
  if (chords.length === 0) return [total];
  const spans = chords.map((c, i) => (chords[i + 1]?.tick ?? total) - c.tick);
  // A bar whose first chord is on beat 2 (the previous chord carries on, decision 6) still fills
  // its first beat with a slash, or the bar would be drawn short.
  return chords[0]!.tick > 0 ? [chords[0]!.tick, ...spans] : spans;
}

/*
 * Beat cells (decision 6). Omkar: *"chord adding logic is weird"*. Typing `A . . E` and having the
 * token count decide the beats was invisible arithmetic. Now a bar is shown as one cell per beat,
 * as iReal Pro shows four spaces per bar, and a chord is typed into the cell for its beat. An empty
 * cell means the chord before carries on, including an empty beat 1, which carries on the previous
 * bar's chord.
 */

/** A bar's chords as cells: one per beat, or one per half-beat if any chord sits between beats. */
export function chordCells(chords: readonly BarChord[], key: Key, ts: TimeSig): { cells: string[]; cellTicks: number } {
  const total = barTicks(ts);
  let cellTicks = beatTicks(ts);
  if (chords.some((c) => c.tick % cellTicks !== 0)) cellTicks /= 2;
  if (chords.some((c) => c.tick % cellTicks !== 0)) cellTicks = PPQ / 4;
  const cells = Array.from({ length: total / cellTicks }, () => "");
  for (const c of chords) cells[c.tick / cellTicks] = barChordText(c, key);
  return { cells, cellTicks };
}

export type CellsParse = { ok: true; chords: BarChord[] } | { ok: false; cell: number; error: string };

/** The inverse. `%` alone in the first cell repeats `prev`; `NC` is N.C.; an empty cell holds. */
export function chordsFromCells(cells: readonly string[], cellTicks: number, key: Key, prev: readonly BarChord[] = []): CellsParse {
  const filled = cells.map((c) => c.trim());
  if (filled[0] === "%" && filled.slice(1).every((c) => c === "")) return { ok: true, chords: prev.map((c) => ({ ...c })) };
  const chords: BarChord[] = [];
  for (const [i, t] of filled.entries()) {
    if (t === "") continue;
    if (/^n\.?c\.?$/i.test(t)) {
      chords.push({ tick: i * cellTicks, chord: null });
      continue;
    }
    const c = parseChord(t, key);
    if (!c) return { ok: false, cell: i, error: `"${t}" is not a chord` };
    chords.push({ tick: i * cellTicks, chord: c });
  }
  return { ok: true, chords };
}

export function sameChord(a: Chord | null, b: Chord | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.root.steps === b.root.steps &&
    a.root.semis === b.root.semis &&
    a.quality === b.quality &&
    a.bass?.steps === b.bass?.steps &&
    a.bass?.semis === b.bass?.semis
  );
}

/**
 * The palette's "Key" row: the triads on each scale degree. A major key gives I ii iii IV V vi
 * vii°, and a minor key, natural minor, gives i ii° III iv v VI VII. Semitones are listed
 * explicitly, not computed from a mode table, so each one can be read against a textbook.
 */
export function diatonicChords(key: Key): Chord[] {
  const major: Array<[number, string]> = [[0, ""], [2, "m"], [4, "m"], [5, ""], [7, ""], [9, "m"], [11, "°"]];
  const minor: Array<[number, string]> = [[0, "m"], [2, "°"], [3, ""], [5, "m"], [7, "m"], [8, ""], [10, ""]];
  return (key.mode === "major" ? major : minor).map(([semis, quality], steps) => ({
    root: { steps, semis },
    quality,
  }));
}

/** Re-reads a chord written in `from` as the same sounding, same spelled chord in `to`. */
export function rekeyChord(c: Chord, from: Key, to: Key): Chord {
  const out: Chord = { root: toDegree(fromDegree(c.root, from), to), quality: c.quality };
  if (c.bass) out.bass = toDegree(fromDegree(c.bass, from), to);
  return out;
}

/*
 * Chord display (decision 7, after OnSong's style setting): the same stored degrees shown as letters,
 * Nashville numbers or Roman numerals. Numbers are counted from the key in force, against the major
 * scale (a ♭3 in a major key is "♭3"). **Inference**: in a minor key, 1 is the minor tonic, as in
 * minor-key Nashville charts that use "1m". He has not ruled on that.
 */
export type ChordView = "letters" | "numbers" | "roman";

const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function degreeLabel(d: Degree, roman: boolean): string {
  const shift = d.semis - MAJOR_SEMIS[d.steps]!;
  const acc = shift > 6 ? shift - 12 : shift < -6 ? shift + 12 : shift;
  const sign = acc === 0 ? "" : (acc > 0 ? "♯" : "♭").repeat(Math.abs(acc));
  return sign + (roman ? ROMAN[d.steps]! : String(d.steps + 1));
}

/** Minor-family qualities: lowercase numeral in Roman, and the "m" moves into the case. */
function minorQuality(q: string): { minor: boolean; rest: string } {
  if (/^(maj|M|Δ)/.test(q)) return { minor: false, rest: q };
  const m = /^(min|mi|m|-)(?!aj)/.exec(q);
  if (m) return { minor: true, rest: q.slice(m[0].length) };
  if (/^(°|dim|ø)/.test(q)) return { minor: true, rest: q };
  return { minor: false, rest: q };
}

export function chordLabel(c: Chord, key: Key, view: ChordView): string {
  if (view === "letters") return chordText(c, key);
  const bass = c.bass ? "/" + degreeLabel(c.bass, view === "roman") : "";
  if (view === "numbers") return degreeLabel(c.root, false) + c.quality + bass;
  const { minor, rest } = minorQuality(c.quality);
  const numeral = degreeLabel(c.root, true);
  return (minor ? numeral.toLowerCase() : numeral) + rest + bass;
}

export function barChordLabel(bc: BarChord, key: Key, view: ChordView): string {
  return bc.chord ? chordLabel(bc.chord, key, view) : "N.C.";
}

/**
 * Parts (decision 7, "working with people"): the same chart shown for a transposing instrument or a
 * capo. Display only: the part is the song transposed, and nothing is stored. Written intervals are
 * the standard ones: B♭ instruments read a major 2nd above concert, E♭ a major 6th, F a perfect 5th.
 * A capo on fret n shows shapes n semitones below the sounding key, as OnSong's capo does.
 */
import { KEYS, fifths, mod, pcOf, sameKey, type Key } from "./pitch";
import { DEFAULT_TONIC_OCTAVE } from "./context";
import { transpose, type Song } from "./song";

export type Part = "concert" | "bb" | "eb" | "f" | `capo${1 | 2 | 3 | 4 | 5 | 6 | 7}`;

export const PARTS: Array<{ id: Part; label: string }> = [
  { id: "concert", label: "Concert" },
  { id: "bb", label: "B♭" },
  { id: "eb", label: "E♭" },
  { id: "f", label: "F" },
  ...([1, 2, 3, 4, 5, 6, 7] as const).map((n) => ({ id: `capo${n}` as Part, label: `Capo ${n}` })),
];

/** Letters and semitones the part reads above concert. */
function interval(part: Part): { letters: number; semis: number } | null {
  if (part === "concert") return null;
  if (part === "bb") return { letters: 1, semis: 2 };
  if (part === "eb") return { letters: 5, semis: 9 };
  if (part === "f") return { letters: 4, semis: 7 };
  return { letters: 0, semis: -Number(part.slice(4)) };
}

/**
 * The key a part reads in. Instruments: the interval by letter, so B♭ concert gives C, not B♯.
 * Capo: the nearest key with the fewest accidentals, since a capo has no letter of its own (C♯ − 1
 * gives C, not B♯).
 */
export function partKey(key: Key, part: Part): Key {
  const iv = interval(part);
  if (!iv) return key;
  const pc = mod(pcOf(key.tonic) + iv.semis, 12);
  const same = KEYS.filter((k) => k.mode === key.mode && pcOf(k.tonic) === pc);
  if (iv.letters !== 0) {
    const letter = mod(key.tonic.letter + iv.letters, 7);
    const byLetter = same.find((k) => k.tonic.letter === letter);
    if (byLetter) return byLetter;
  }
  return same.sort((a, b) => Math.abs(fifths(a)) - Math.abs(fifths(b)))[0] ?? key;
}

export function partSong(song: Song, part: Part): Song {
  const key = partKey(song.key, part);
  if (sameKey(key, song.key)) return song;
  const iv = interval(part)!;
  if (iv.letters === 0) return transpose(song, key);
  // Instruments read *up* their interval: an alto sax's concert C4 is written A4, not A3, so the
  // tonic moves up by the interval's letters rather than to the nearer octave.
  const oct = song.tonicOctave ?? DEFAULT_TONIC_OCTAVE;
  const step = oct * 7 + song.key.tonic.letter + iv.letters;
  return { ...song, key: { tonic: key.tonic, mode: song.key.mode }, tonicOctave: Math.floor((step - mod(key.tonic.letter - (song.key.tonic.letter + iv.letters), 7)) / 7) };
}

/**
 * Chord suggestions while typing (decision 5). The first version put a 430-px palette of every chip
 * under the box on every click, and it covered the next system. Now a short list narrows as the
 * root is typed: the song's own chords first, by how often they are used, then the key's diatonic
 * chords, then common qualities on the typed root. This is how iReal Pro's quick entry and a
 * command palette both behave: type, and the list narrows.
 */
import { chordText, diatonicChords, normaliseQuality, parseChord, sameChord, type Chord } from "../core/chord";
import { readSpelled, spelledText } from "../core/pitch";
import type { Song } from "../core/song";

const COMMON = ["", "m", "7", "maj7", "m7", "sus4", "sus2", "add9", "9", "m9", "maj9", "6", "°", "ø7", "+", "7sus4", "m11", "13"];

export function songChords(song: Song): Chord[] {
  const counts: Array<{ chord: Chord; n: number }> = [];
  for (const s of song.sections)
    for (const b of s.bars)
      for (const c of b.chords) {
        if (!c.chord) continue;
        const hit = counts.find((x) => sameChord(x.chord, c.chord));
        if (hit) hit.n++;
        else counts.push({ chord: c.chord, n: 1 });
      }
  return counts.sort((a, b) => b.n - a.n).map((x) => x.chord);
}

/** The token being typed: the text after the last space. */
export function currentToken(value: string): string {
  return /(\S*)$/.exec(value)?.[1] ?? "";
}

export function replaceToken(value: string, token: string): string {
  return value.replace(/(\S*)$/, token);
}

/**
 * Up to `limit` chord texts for what is typed so far. An empty token offers the song's chords and
 * the key's. A typed root narrows to chords on that root, so `c#` offers C♯min11 before C♯m.
 * Matching is a prefix of the spelled text, so `c#m1` does not match C♯min11. That is deliberate:
 * prefixes are predictable, and a typed quality means what it says.
 */
export function suggest(song: Song, token: string, limit = 8): string[] {
  const out: string[] = [];
  const add = (t: string) => {
    if (!out.includes(t)) out.push(t);
  };
  const pool = [...songChords(song), ...diatonicChords(song.key)].map((c) => chordText(c, song.key));
  if (token === "") {
    pool.forEach(add);
    return out.slice(0, limit);
  }
  const root = readSpelled(token);
  if (!root) return [];
  const rootText = spelledText(root.spelled);
  const typed = rootText + normaliseQuality(root.rest);
  pool.filter((t) => t.startsWith(typed) && /^[A-G][♯♭𝄪𝄫]*/.exec(t)?.[0] === rootText).forEach(add);
  for (const q of COMMON) {
    const t = rootText + q;
    if (t.startsWith(typed) && parseChord(t, song.key)) add(t);
  }
  return out.slice(0, limit);
}

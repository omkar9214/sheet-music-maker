/**
 * The chord palette, under the chord box (decision 3: "Type + palette"). It never takes focus away
 * from the box, so typing and clicking mix freely. Rows are labels and chips only (§7.1).
 */
import { chordText, diatonicChords, sameChord, type Chord } from "../core/chord";
import { keyName, readSpelled } from "../core/pitch";
import type { Song } from "../core/song";

/** The qualities in his chart first, then the common ones. */
const QUALITIES = ["maj7", "min11", "m", "m7", "7", "maj9", "m+", "m7♯9", "7sus2", "sus2", "sus4", "7sus4", "add9", "6", "9", "13", "°", "ø", "+"];

/** The song's chords, most used first, so a chart's five chords are one click each after the first
 * pass. */
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
  return counts.sort((a, b) => b.n - a.n).map((x) => x.chord).slice(0, 14);
}

/** Replaces the last token of `value` with `token`, or appends one. */
export function replaceLastToken(value: string, token: string): string {
  const m = /^(.*?)(\S*)$/.exec(value);
  const head = m?.[1] ?? "";
  return head + token;
}

/** Puts `quality` on the last token's root: `C#m7` + `maj7` → `C#maj7`. */
export function applyQuality(value: string, quality: string): string {
  const m = /^(.*?)(\S*)$/.exec(value);
  const head = m?.[1] ?? "";
  const tok = m?.[2] ?? "";
  const root = readSpelled(tok);
  if (!root) return value;
  const rootText = tok.slice(0, tok.length - root.rest.length);
  const slash = root.rest.lastIndexOf("/");
  const bass = slash >= 0 ? root.rest.slice(slash) : "";
  return head + rootText + quality + bass;
}

export function ChordPalette(props: { song: Song; onPick: (f: (v: string) => string) => void }) {
  const { song } = props;
  const used = songChords(song);
  const chip = (label: string, f: (v: string) => string, key: string) => (
    <button
      key={key}
      className="chip"
      // Keeps the chord box focused: a chip is part of typing, not a new place to be.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => props.onPick(f)}
    >
      {label}
    </button>
  );
  return (
    <div className="palette" onMouseDown={(e) => e.preventDefault()}>
      {used.length > 0 && (
        <div className="palette-row">
          <span className="palette-label">Song</span>
          {used.map((c, i) => {
            const t = chordText(c, song.key);
            return chip(t, (v) => replaceLastToken(v, t), `u${i}`);
          })}
        </div>
      )}
      <div className="palette-row">
        <span className="palette-label">{keyName(song.key)}</span>
        {diatonicChords(song.key).map((c, i) => {
          const t = chordText(c, song.key);
          return chip(t, (v) => replaceLastToken(v, t), `d${i}`);
        })}
      </div>
      <div className="palette-row">
        <span className="palette-label">Quality</span>
        {QUALITIES.map((q) => chip(q, (v) => applyQuality(v, q), q))}
      </div>
    </div>
  );
}

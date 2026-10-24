/**
 * ChordPro, the interchange format of OnSong, SongbookPro, MobileSheets and others (decision 7;
 * `docs/research/chart-apps.md`). A chart is written as ChordPro 6 **grid** sections
 * (https://chordpro.org/beta/directives-env_grid/): `| C . G . |`, one cell per beat, with
 * `|:` `:|` `|1` `|.` bar symbols.
 *
 * Lossy by nature: rhythms, written notes and cue placement have no ChordPro form. The file says so
 * in its first comment. The chart file (`file.ts`) is the lossless format.
 */
import { barChordText, parseChord, type BarChord } from "../chord";
import { barContexts } from "../context";
import { KEYS, keyName, readSpelled, sameKey, type Key } from "../pitch";
import { SLASHES_ID, builtinPatterns, starterPatterns } from "../rhythm";
import { keyChangeBetween, type KeyChange } from "../context";
import { allBars, emptyBar, newId, type Bar, type Section, type Song } from "../song";
import { barTicks, beatTicks, type TimeSig } from "../ticks";

/** ChordPro readers expect ASCII accidentals in chord names. */
function ascii(t: string): string {
  return t.replace(/𝄪/g, "##").replace(/𝄫/g, "bb").replace(/♯/g, "#").replace(/♭/g, "b");
}

const BARS_PER_LINE = 4;

export function toChordPro(song: Song): string {
  const ctx = barContexts(song);
  const out: string[] = [
    `# Exported from Sheet Music Maker. Chords, sections, repeats and endings only: rhythms and written notes are not part of ChordPro.`,
    `{title: ${song.title}}`,
  ];
  if (song.source) out.push(`{subtitle: ${song.source}}`);
  out.push(`{key: ${ascii(keyName(song.key))}}`, `{tempo: ${song.tempo}}`, `{time: ${song.time.beats}/${song.time.unit}}`, "");

  const flat = allBars(song);
  for (const section of song.sections) {
    // A section is split into grids wherever the key or meter changes inside it, because a grid
    // has one shape and ChordPro's {key} applies from where it is written.
    const groups: Bar[][] = [];
    for (const b of section.bars) {
      const c = ctx.get(b.id)!;
      if (groups.length === 0 || c.keyChanged || c.timeChanged || c.tempoChanged) groups.push([]);
      groups[groups.length - 1]!.push(b);
    }
    const cues: string[] = [];
    for (const b of section.bars) {
      const n = flat.find((x) => x.bar.id === b.id)!.number;
      if (b.cueAbove) cues.push(`{comment: ${n}: ${b.cueAbove}}`);
      if (b.cueBelow) cues.push(`{comment: ${n}: ${b.cueBelow}}`);
    }
    out.push(...cues);
    groups.forEach((bars, gi) => {
      const c = ctx.get(bars[0]!.id)!;
      if (c.keyChanged) out.push(`{key: ${ascii(keyName(c.key))}}`);
      if (c.timeChanged) out.push(`{time: ${c.time.beats}/${c.time.unit}}`);
      if (c.tempoChanged) out.push(`{tempo: ${c.tempo}}`);
      const beats = barTicks(c.time) / beatTicks(c.time);
      const label = gi === 0 ? ` label="${section.name}"` : "";
      out.push(`{start_of_grid${label} shape="${Math.min(BARS_PER_LINE, bars.length)}x${beats}"}`);
      for (let i = 0; i < bars.length; i += BARS_PER_LINE) {
        const line = bars.slice(i, i + BARS_PER_LINE);
        const tokens: string[] = [];
        line.forEach((b, k) => {
          const prev = k === 0 ? undefined : line[k - 1];
          tokens.push(leftBar(b, prev));
          tokens.push(...beatCells(b, c.key, c.time));
        });
        const last = line[line.length - 1]!;
        const isEnd = last.id === flat[flat.length - 1]!.bar.id;
        tokens.push(last.repeatEnd ? ":|" : isEnd ? "|." : "|");
        if (last.repeatEnd && last.repeatEnd.times > 2) tokens.push(`${last.repeatEnd.times}x`);
        out.push(tokens.join(" "));
      }
      out.push("{end_of_grid}", "");
    });
  }
  return out.join("\n");
}

/** The bar symbol before `b`: a repeat start, an ending, or a plain bar, merged with the repeat end
 * of the bar before it on the same line. */
function leftBar(b: Bar, prev: Bar | undefined): string {
  const endsBefore = !!prev?.repeatEnd;
  const startsEnding = b.ending && b.ending.join(",") !== prev?.ending?.join(",");
  if (startsEnding) return `${endsBefore ? ":" : ""}|${b.ending![0]}`;
  if (b.repeatStart) return endsBefore ? ":|:" : "|:";
  return endsBefore ? ":|" : "|";
}

/** One cell per beat; chords between beats share their beat's cell with `~`. */
function beatCells(b: Bar, key: Key, time: TimeSig): string[] {
  const beat = beatTicks(time);
  const n = barTicks(time) / beat;
  const cells = Array.from({ length: n }, () => [] as string[]);
  for (const c of b.chords) cells[Math.min(n - 1, Math.floor(c.tick / beat))]!.push(ascii(barChordText(c, key)));
  return cells.map((x) => (x.length ? x.join("~") : "."));
}

/* ---------------------------------------------------------------------------------------------- */

export type ImportResult = { ok: true; song: Song; skipped: string[] } | { ok: false; error: string };

function directive(line: string): { name: string; value: string; attrs: Record<string, string> } | null {
  const m = /^\{\s*([a-z_]+)(.*)\}\s*$/i.exec(line.trim());
  if (!m) return null;
  const rest = m[2] ?? "";
  const attrs: Record<string, string> = {};
  for (const a of rest.matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]!] = a[2]!;
  // `{title: X}` has a value after a colon; `{start_of_grid label="X"}` has attributes instead.
  const value = /^\s*:/.test(rest) ? rest.replace(/^\s*:/, "").trim() : rest.replace(/(\w+)="([^"]*)"/g, "").trim();
  return { name: m[1]!.toLowerCase(), value, attrs };
}

function readKey(t: string): Key | null {
  const s = readSpelled(t.trim());
  if (!s) return null;
  const mode = /^m(?!aj)|min/i.test(s.rest.trim()) ? "minor" : "major";
  return KEYS.find((k) => k.mode === mode && k.tonic.letter === s.spelled.letter && k.tonic.acc === s.spelled.acc) ?? null;
}

const BAR_SYMBOL = /^(\|\||\|\.|:\|:|\|:|:?\|\d+>?|:\|\d*|\|)$/;

/**
 * ChordPro in: grids bar for bar, and lyric-style songs one bar per chord, in the order sung.
 * Chords that do not parse are listed in `skipped`, never invented.
 */
export function fromChordPro(text: string): ImportResult {
  let title = "Untitled";
  let source = "";
  let key: Key | null = null;
  let tempo = 90;
  let time: TimeSig = { beats: 4, unit: 4 };
  const sections: Section[] = [];
  const skipped: string[] = [];
  let inGrid = false;
  let current: Section | null = null;
  let pendingName: string | null = null;
  let pendingKey: KeyChange | null = null;
  // Chords are stored relative to the key in force where they are, so after a {key} change they
  // are read in the new key.
  let localKey: Key | null = null;
  let pendingTime: TimeSig | null = null;
  let pendingTempo: number | null = null;
  let lastChords: BarChord[] = [];
  let endingOpen: number[] | null = null;

  const homeKey = () => key ?? KEYS[0]!;
  const open = (name: string) => {
    current = { id: newId("x"), name: name || `Section ${sections.length + 1}`, pattern: SLASHES_ID, bars: [] };
    sections.push(current);
  };
  const addBar = (chords: BarChord[], extra: Partial<Bar> = {}) => {
    if (!current) open(pendingName ?? `Section ${sections.length + 1}`);
    pendingName = null;
    const bar: Bar = { ...emptyBar(), chords, ...extra };
    if (pendingKey) bar.keyChange = pendingKey;
    if (pendingTime) bar.timeChange = pendingTime;
    if (pendingTempo !== null) bar.tempoChange = pendingTempo;
    pendingKey = null;
    pendingTime = null;
    pendingTempo = null;
    current!.bars.push(bar);
    lastChords = chords;
    return bar;
  };
  const chordOf = (t: string, k: Key) => {
    if (/^n\.?c\.?$/i.test(t)) return null;
    const c = parseChord(t, k);
    if (!c) skipped.push(t);
    return c ?? undefined;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const d = directive(line);
    if (d) {
      const v = d.value;
      switch (d.name) {
        case "title": case "t": title = v || title; break;
        case "subtitle": case "st": case "artist": if (!source) source = v; break;
        case "key": {
          const k = readKey(v);
          if (!k) break;
          if (!key && sections.length === 0) key = k;
          else if (!sameKey(k, localKey ?? homeKey())) {
            pendingKey = keyChangeBetween(homeKey(), k);
            localKey = k;
          }
          break;
        }
        case "tempo": { const n = Number(v); if (n >= 20 && n <= 400) { if (sections.length === 0) tempo = n; else pendingTempo = n; } break; }
        case "time": {
          const m = /^(\d+)\/(2|4|8)$/.exec(v);
          if (m) { const ts = { beats: Number(m[1]), unit: Number(m[2]) as 2 | 4 | 8 }; if (sections.length === 0) time = ts; else pendingTime = ts; }
          break;
        }
        case "start_of_grid": case "sog": {
          inGrid = true;
          const label = d.attrs.label ?? (v && !/^[\d+x]+$/.test(v) ? v : pendingName);
          // A grid with no label carries on the section before it: the exporter splits a section
          // into grids where its key or meter changes.
          if (label) open(label);
          else current = sections[sections.length - 1] ?? null;
          pendingName = null;
          break;
        }
        case "end_of_grid": case "eog": inGrid = false; current = null; break;
        case "start_of_verse": case "sov": open(d.attrs.label ?? (v || "Verse")); break;
        case "start_of_chorus": case "soc": open(d.attrs.label ?? (v || "Chorus")); break;
        case "start_of_bridge": case "sob": open(d.attrs.label ?? (v || "Bridge")); break;
        case "end_of_verse": case "eov": case "end_of_chorus": case "eoc": case "end_of_bridge": case "eob": current = null; break;
        case "comment": case "c": case "comment_italic": case "ci":
          // A comment that names a section ("Intro", "Chorus 2") starts one; any other is a cue on
          // the next bar written.
          if (/^(intro|verse|pre-?chorus|chorus|bridge|solo|interlude|outro|instrumental|tag|coda)\b/i.test(v)) {
            current = null;
            pendingName = v.replace(/:$/, "");
          }
          break;
        default: break;
      }
      continue;
    }
    const k = localKey ?? homeKey();
    if (inGrid) {
      // Cells between bar symbols. Text before the first bar is the left margin; "4x" after the
      // last is a repeat count.
      const tokens = line.split(/\s+/);
      const first = tokens.findIndex((t) => BAR_SYMBOL.test(t));
      if (first < 0) continue;
      let cells: string[] = [];
      let startFlags: Partial<Bar> = {};
      const closeBar = (symbol: string) => {
        if (cells.length === 0) return;
        const beat = barTicks(time) / cells.length;
        const chords: BarChord[] = [];
        let pct = false;
        cells.forEach((cell, i) => {
          if (cell === "%") pct = true;
          if (cell === "." || cell === "/" || cell === "%" || cell === "%%") return;
          const parts = cell.split("~");
          parts.forEach((p, j) => {
            const c = chordOf(p, k);
            if (c !== undefined) chords.push({ tick: Math.round((i + j / parts.length) * beat / 240) * 240, chord: c });
          });
        });
        const bar = addBar(pct && chords.length === 0 ? lastChords.map((c) => ({ ...c })) : chords, startFlags);
        if (endingOpen) bar.ending = [...endingOpen];
        if (/^:\|/.test(symbol)) {
          bar.repeatEnd = { times: 2 };
          endingOpen = null;
        }
        cells = [];
        startFlags = {};
      };
      for (const t of tokens.slice(first)) {
        if (BAR_SYMBOL.test(t)) {
          closeBar(t);
          if (/^(\|:|:\|:)$/.test(t)) startFlags.repeatStart = true;
          const volta = /\|(\d+)/.exec(t);
          if (volta) endingOpen = [Number(volta[1])];
          else if (t === "||" || t === "|.") endingOpen = null;
        } else if (/^\d+x$/i.test(t)) {
          const bars = (current as Section | null)?.bars;
          const last = bars?.[bars.length - 1];
          if (last?.repeatEnd) last.repeatEnd = { times: Number(t.slice(0, -1)) };
        } else {
          cells.push(t);
        }
      }
      continue;
    }
    // Lyric-style: each [chord] is a bar, in the order sung.
    for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
      const c = chordOf(m[1]!.trim(), k);
      if (c !== undefined) addBar([{ tick: 0, chord: c }]);
    }
  }

  const real = sections.filter((s) => s.bars.length > 0);
  if (real.length === 0) return { ok: false, error: "no chords found" };
  return {
    ok: true,
    skipped,
    song: {
      id: newId("s"),
      title,
      source,
      key: homeKey(),
      tempo,
      time,
      clef: "treble8vb",
      patterns: [...builtinPatterns(), ...starterPatterns()],
      sections: real,
    },
  };
}

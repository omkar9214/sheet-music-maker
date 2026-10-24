/**
 * MusicXML 4.0 export (decision 8: *"Yes, export only"*), so a chart opens in MuseScore, Sibelius,
 * Dorico or Finale. One part, the chart as drawn:
 * - slash bars as slash noteheads (stems as on the page, none for Slashes)
 * - written notes as notes
 * - chord symbols as `<harmony>`, with the typed quality as display text
 * - section labels and cues as words, boxed above and plain below, as in his PDF
 * - repeats, endings, segno/coda, jumps, and key, meter and tempo changes
 *
 * Reference: https://www.w3.org/2021/06/musicxml40/ (elements `harmony`, `notehead`, `barline`,
 * `ending`, `direction`).
 */
import { type BarChord, type Chord, fromDegree } from "../chord";
import { barContexts, type BarContext } from "../context";
import { shownAccidentals, writtenEvents, writtenOf } from "../notes";
import { fifths } from "../pitch";
import { barRhythm, beamGroups, onsets, type RhythmEvent } from "../rhythm";
import { allBars, barPatternId, patternById, type Bar, type Song } from "../song";
import { PPQ } from "../ticks";

/** Divisions per quarter: 8, so a 32nd is 1 and every value here is a whole number. */
const DIV = 8;
const dur = (ticks: number) => Math.round((ticks * DIV) / PPQ);

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const TYPES: Array<[number, string]> = [
  [PPQ * 4, "whole"], [PPQ * 2, "half"], [PPQ, "quarter"], [PPQ / 2, "eighth"], [PPQ / 4, "16th"], [PPQ / 8, "32nd"],
];

function typeOf(ticks: number): { type: string; dots: number } {
  for (const [t, name] of TYPES) {
    if (ticks === t) return { type: name, dots: 0 };
    if (ticks === t * 1.5) return { type: name, dots: 1 };
  }
  return { type: "quarter", dots: 0 };
}

const STEP = ["C", "D", "E", "F", "G", "A", "B"];

/** Kinds MusicXML names, from the typed quality. Anything else is "other" with the text shown. */
const KINDS: Record<string, string> = {
  "": "major", m: "minor", min: "minor", "-": "minor", "7": "dominant", maj7: "major-seventh", M7: "major-seventh", "Δ7": "major-seventh", Δ: "major-seventh",
  m7: "minor-seventh", min7: "minor-seventh", "-7": "minor-seventh", "°": "diminished", dim: "diminished", "°7": "diminished-seventh", dim7: "diminished-seventh",
  ø: "half-diminished", ø7: "half-diminished", "m7♭5": "half-diminished", "+": "augmented", aug: "augmented", sus4: "suspended-fourth", sus: "suspended-fourth",
  sus2: "suspended-second", "6": "major-sixth", m6: "minor-sixth", "9": "dominant-ninth", maj9: "major-ninth", m9: "minor-ninth", min9: "minor-ninth",
  "11": "dominant-11th", m11: "minor-11th", min11: "minor-11th", "13": "dominant-13th", maj13: "major-13th", m13: "minor-13th", "m(maj7)": "major-minor", "5": "power",
};

function harmony(c: BarChord, ctx: BarContext, offset: number): string {
  const off = offset > 0 ? `<offset>${dur(offset)}</offset>` : "";
  if (!c.chord) return `<harmony><root><root-step>C</root-step></root><kind text="N.C.">none</kind>${off}</harmony>`;
  const ch: Chord = c.chord;
  const root = fromDegree(ch.root, ctx.key);
  const alter = root.acc ? `<root-alter>${root.acc}</root-alter>` : "";
  const kind = KINDS[ch.quality] ?? "other";
  let bass = "";
  if (ch.bass) {
    const b = fromDegree(ch.bass, ctx.key);
    bass = `<bass><bass-step>${STEP[b.letter]}</bass-step>${b.acc ? `<bass-alter>${b.acc}</bass-alter>` : ""}</bass>`;
  }
  return `<harmony><root><root-step>${STEP[root.letter]}</root-step>${alter}</root><kind text="${esc(ch.quality)}">${kind}</kind>${bass}${off}</harmony>`;
}

function words(text: string, placement: "above" | "below", box: boolean): string {
  return `<direction placement="${placement}"><direction-type><words${box ? ' enclosure="rectangle"' : ""}>${esc(text)}</words></direction-type></direction>`;
}

function clef(song: Song): string {
  if (song.clef === "bass") return "<clef><sign>F</sign><line>4</line></clef>";
  if (song.clef === "treble") return "<clef><sign>G</sign><line>2</line></clef>";
  return "<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>";
}

const JUMPS: Record<string, string> = { toCoda: "To Coda", dsAlCoda: "D.S. al Coda", dcAlCoda: "D.C. al Coda", dcAlFine: "D.C. al Fine", fine: "Fine" };

interface Ev {
  start: number;
  ticks: number;
  rest: boolean;
  tie: boolean;
  /** Written pitches: [step, alter, octave, shown accidental or null]. Empty for slashes. */
  pitches: Array<[string, number, number, number | null]>;
  slash: boolean;
  stemless: boolean;
}

function eventsOf(song: Song, bar: Bar, ctx: BarContext): Ev[] {
  if (bar.notes) {
    const acc = shownAccidentals(bar.notes, ctx);
    return writtenEvents(bar.notes, ctx.time).map((e) => ({
      start: e.start,
      ticks: e.ticks,
      rest: e.rest,
      tie: e.tie,
      slash: false,
      stemless: false,
      pitches: e.pitches.map((p, i) => {
        const w = writtenOf(p, ctx);
        return [STEP[w.letter]!, w.acc, w.octave, acc[e.run]?.[i] ?? null];
      }),
    }));
  }
  const sec = song.sections.find((s) => s.bars.includes(bar))!;
  const r = barRhythm(patternById(song, barPatternId(sec, bar)), bar.chords, ctx.time, bar.rhythm);
  const starts = onsets(r.events);
  // Slashes sit on the middle line: B4 in treble, D3 in bass.
  const mid: [string, number, number, null] = song.clef === "bass" ? ["D", 0, 3, null] : ["B", 0, 4, null];
  return r.events.map((e, i) => ({ start: starts[i]!, ticks: e.ticks, rest: e.rest, tie: !!e.tie, slash: true, stemless: r.stemless, pitches: e.rest ? [] : [mid] }));
}

function beams(evs: Ev[], ctx: BarContext): Map<number, string> {
  const rhythm: RhythmEvent[] = evs.map((e) => ({ ticks: e.ticks, rest: e.rest }));
  const out = new Map<number, string>();
  if (evs.some((e) => e.stemless)) return out;
  for (const [a, z] of beamGroups(rhythm, ctx.time)) {
    for (let i = a; i <= z; i++) {
      const one = i === a ? "begin" : i === z ? "end" : "continue";
      let two = "";
      if (evs[i]!.ticks <= PPQ / 4) {
        const prev = i > a && evs[i - 1]!.ticks <= PPQ / 4;
        const next = i < z && evs[i + 1]!.ticks <= PPQ / 4;
        const v = prev && next ? "continue" : prev ? "end" : next ? "begin" : i === z ? "backward hook" : "forward hook";
        two = `<beam number="2">${v}</beam>`;
      }
      out.set(i, `<beam number="1">${one}</beam>${two}`);
    }
  }
  return out;
}

function note(e: Ev, i: number, beam: Map<number, string>, tiedIn: boolean): string {
  const { type, dots } = typeOf(e.ticks);
  const d = "<dot/>".repeat(dots);
  if (e.rest) return `<note><rest/><duration>${dur(e.ticks)}</duration><type>${type}</type>${d}</note>`;
  return e.pitches
    .map(([step, alter, octave, shown], k) => {
      const tie = (tiedIn ? '<tie type="stop"/>' : "") + (e.tie ? '<tie type="start"/>' : "");
      const tied = (tiedIn ? '<tied type="stop"/>' : "") + (e.tie ? '<tied type="start"/>' : "");
      const acc = shown === null ? "" : `<accidental>${{ [-2]: "flat-flat", [-1]: "flat", 0: "natural", 1: "sharp", 2: "double-sharp" }[shown] ?? "natural"}</accidental>`;
      const stem = e.slash ? `<stem>${e.stemless ? "none" : "down"}</stem>` : "";
      const head = e.slash ? "<notehead>slash</notehead>" : "";
      return (
        `<note>${k > 0 ? "<chord/>" : ""}<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave></pitch>` +
        `<duration>${dur(e.ticks)}</duration>${tie}<type>${type}</type>${d}${acc}${stem}${head}${k === 0 ? beam.get(i) ?? "" : ""}` +
        `${tied ? `<notations>${tied}</notations>` : ""}</note>`
      );
    })
    .join("");
}

export function toMusicXML(song: Song): string {
  const ctx = barContexts(song);
  const flat = allBars(song);
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `<work><work-title>${esc(song.title)}</work-title></work>`,
    `<identification>${song.source ? `<creator type="composer">${esc(song.source)}</creator>` : ""}<encoding><software>Sheet Music Maker</software></encoding></identification>`,
    '<part-list><score-part id="P1"><part-name>Chart</part-name></score-part></part-list>',
    '<part id="P1">',
  ];
  // A note tied over the barline: its tie stop belongs on the next bar's first note.
  let carryTie = false;
  flat.forEach(({ bar, section, number }, idx) => {
    const c = ctx.get(bar.id)!;
    const prev = flat[idx - 1]?.bar;
    const next = flat[idx + 1]?.bar;
    const first = idx === 0;
    const sectionStart = section.bars[0]!.id === bar.id;
    const m: string[] = [`<measure number="${number}">`];
    if (sectionStart && !first) m.push('<print new-system="yes"/>');
    // Left barline: repeat start, ending start.
    const endingStart = bar.ending && bar.ending.join(",") !== prev?.ending?.join(",");
    if (bar.repeatStart || endingStart) {
      m.push(
        `<barline location="left">${bar.repeatStart ? "<bar-style>heavy-light</bar-style>" : ""}` +
          `${endingStart ? `<ending number="${bar.ending!.join(", ")}" type="start">${bar.ending!.join(", ")}.</ending>` : ""}` +
          `${bar.repeatStart ? '<repeat direction="forward"/>' : ""}</barline>`,
      );
    }
    const attrs: string[] = [];
    if (first) attrs.push(`<divisions>${DIV}</divisions>`);
    if (first || c.keyChanged) attrs.push(`<key><fifths>${fifths(c.key)}</fifths><mode>${c.key.mode}</mode></key>`);
    if (first || c.timeChanged) attrs.push(`<time><beats>${c.time.beats}</beats><beat-type>${c.time.unit}</beat-type></time>`);
    if (first) attrs.push(clef(song));
    if (attrs.length) m.push(`<attributes>${attrs.join("")}</attributes>`);
    if (sectionStart) m.push(`<direction placement="above"><direction-type><words font-size="14">${esc(section.name)}:</words></direction-type></direction>`);
    if (first || c.tempoChanged) {
      m.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${c.tempo}</per-minute></metronome></direction-type><sound tempo="${c.tempo}"/></direction>`);
    }
    if (bar.marker === "segno") m.push('<direction placement="above"><direction-type><segno/></direction-type></direction>');
    if (bar.marker === "coda") m.push('<direction placement="above"><direction-type><coda/></direction-type></direction>');
    if (bar.cueAbove) m.push(words(bar.cueAbove, "above", true));
    if (bar.cueBelow) m.push(words(bar.cueBelow, "below", false));

    const evs = eventsOf(song, bar, c);
    const bm = beams(evs, c);
    const chords = [...bar.chords];
    evs.forEach((e, i) => {
      // Chord symbols attach to the event they fall in, offset into it if they start inside it.
      while (chords.length && chords[0]!.tick < e.start + e.ticks) {
        const ch = chords.shift()!;
        m.push(harmony(ch, c, Math.max(0, ch.tick - e.start)));
      }
      const tiedIn = i > 0 ? evs[i - 1]!.tie && !evs[i - 1]!.rest : carryTie && !e.rest;
      m.push(note(e, i, bm, tiedIn));
    });
    const lastEv = evs[evs.length - 1];
    carryTie = !!lastEv && lastEv.tie && !lastEv.rest && !lastEv.slash;
    if (bar.jump) m.push(words(JUMPS[bar.jump]!, "above", false));

    // Right barline: repeat end, ending stop, final, or a double bar before a key change.
    const endingEnd = bar.ending && bar.ending.join(",") !== next?.ending?.join(",");
    const isLast = idx === flat.length - 1;
    const keyNext = next && ctx.get(next.id)!.keyChanged;
    if (bar.repeatEnd || endingEnd || isLast || keyNext) {
      const style = bar.repeatEnd || isLast ? "light-heavy" : keyNext ? "light-light" : "regular";
      const ending = endingEnd ? `<ending number="${bar.ending!.join(", ")}" type="${bar.repeatEnd ? "stop" : "discontinue"}"/>` : "";
      const repeat = bar.repeatEnd ? `<repeat direction="backward"${bar.repeatEnd.times > 2 ? ` times="${bar.repeatEnd.times}"` : ""}/>` : "";
      m.push(`<barline location="right"><bar-style>${style}</bar-style>${ending}${repeat}</barline>`);
    }
    m.push("</measure>");
    out.push(m.join(""));
  });
  out.push("</part>", "</score-partwise>");
  return out.join("\n");
}

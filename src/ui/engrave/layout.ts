/**
 * Song → pages. Pure: text widths come from `measure`, so this runs in tests without a browser.
 * It decides where things go, never what they are (non-negotiable 3). The chords, rhythms and cues
 * all come from `core`.
 */
import { barChordLabel, type ChordView } from "../../core/chord";
import { barContexts, type BarContext } from "../../core/context";
import { shownAccidentals, stepOf, writtenEvents, writtenOf } from "../../core/notes";
import { fifths } from "../../core/pitch";
import { barRhythm, beamGroups, onsets, type RhythmEvent } from "../../core/rhythm";
import { allBars, barPatternId, patternById, type Bar, type Clef, type Jump, type Marker, type Song } from "../../core/song";
import { PPQ, barTicks, isCompound, type TimeSig } from "../../core/ticks";
import {
  BELOW_BASELINE, BELOW_MIN, BELOW_ROW, BOX_PAD_X, BOX_ROW, CHORD_ROW, CONTENT_W, FIRST_INDENT,
  LABEL_GAP, LINE, MARGIN_BOTTOM, MARGIN_X, PAGE1_CONTENT_TOP, PAGEN_CONTENT_TOP, PAGE_H, SIZE, SP,
  STAFF_H, SYSTEM_GAP, TEMPO_EXTRA, TEMPO_RAISE, TEMPO_X, VOLTA_ROW,
} from "./metrics";

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
}
export type Measure = (text: string, size: number, style?: TextStyle) => number;

export interface EventLayout {
  x: number;
  ticks: number;
  rest: boolean;
  tie?: boolean;
}

export interface ChordLayout {
  x: number;
  text: string;
}

/** Something in a row above or below the staff. Rows count outward from the staff. */
export interface RowItem {
  kind: "cue" | "marker" | "jump" | "count" | "tempo";
  barId: string;
  x: number;
  w: number;
  row: number;
  text: string;
  marker?: Marker;
}

export interface BarLayout {
  bar: Bar;
  number: number;
  sectionId: string;
  x: number;
  w: number;
  contentX: number;
  events: EventLayout[];
  stemless: boolean;
  fellBack: boolean;
  beams: Array<[number, number]>;
  chords: ChordLayout[];
  /** The first bar of a run with this ending, so the bracket gets its hook and number. */
  endingStart: boolean;
  endingClosed: boolean;
  final: boolean;
  /** The next bar changes key: this one ends on a double bar. */
  doubleBar: boolean;
  /** Written notes (decision 8), one entry per event: staff positions (half-spaces up from the
   * bottom line) and the accidental to print, or null. */
  notes?: NoteHeads[];
  /** A key or meter change drawn inside the system at this bar (decision 7). */
  inline?: { key?: { cancel: number; fifths: number; prevFifths: number }; time?: TimeSig; x: number };
  /** Where a tick falls in this bar, for the note cursor. */
  xAt: (tick: number) => number;
  ctx: BarContext;
}

export interface NoteHeads {
  pitches: Array<{ pos: number; acc: number | null }>;
}

export interface SystemLayout {
  /** Staff top, page coordinates. */
  y: number;
  top: number;
  bottom: number;
  x0: number;
  x1: number;
  clef: Clef;
  fifths: number;
  /** Cancelling naturals before the signature, when a key change lands on the system's first bar. */
  cancel: { count: number; prevFifths: number } | undefined;
  time?: TimeSig;
  headerW: number;
  label?: string;
  sectionId: string;
  tempo?: number;
  /** How far the tempo mark is lifted above the chord row, to clear the first chord. */
  tempoRaise?: number;
  /** In compound time the beat is a dotted quarter: ♩. = n. */
  tempoDotted?: boolean;
  barNumber?: number;
  bars: BarLayout[];
  hasVolta: boolean;
  boxRows: number;
  belowRows: number;
  above: RowItem[];
  below: RowItem[];
}

export interface PageLayout {
  index: number;
  systems: SystemLayout[];
}

/**
 * Horizontal space for a duration. **Inference**, tuned so that his strum bar needs about 104 pt
 * and four of them fit even the first system (clef, five sharps, 4/4), as in the PDF. At
 * 1.2 + 2.0·√ it needed 111 pt and the Intro broke 3 + 1. It grows with the square root of the
 * duration, as engravers' spacing tables do (Gould, "Spacing": proportional, not linear).
 */
export function eventSpace(ticks: number): number {
  return SP * (1.1 + 1.9 * Math.sqrt(ticks / PPQ));
}

/**
 * Decision 11, Omkar: "4 bars max" in a line. Width alone let Slashes bars (the default for a new
 * section) pack 14 to a system and Beats 7. Width can still break a line sooner; it is never
 * padded out to four.
 */
export const MAX_BARS_PER_SYSTEM = 4;

const REPEAT_W = LINE.thick + LINE.barlineSep + LINE.thin + LINE.barlineSep + 0.42 * SP;

export function headerWidth(clef: Clef, fifthsCount: number, time?: TimeSig): number {
  void clef;
  const clefW = 0.6 * SP + 2.56 * SP + 0.9 * SP;
  const keyW = Math.abs(fifthsCount) * 1.05 * SP + (fifthsCount ? 0.8 * SP : 0);
  const timeW = time ? 1.9 * SP + 0.9 * SP : 0;
  return clefW + keyW + timeW;
}

function keyWidth(fifthsCount: number, cancel: number): number {
  const n = Math.abs(fifthsCount) + cancel;
  return n ? n * 1.05 * SP + 0.8 * SP : 0;
}
const TIME_W = 1.9 * SP + 0.9 * SP;

/** Cancelling naturals at a key change: the old signature's, when the new one has none or turns
 * from sharps to flats or back. **Inference**: Gould leaves cancellation largely to taste, and this
 * is the sparing modern practice. */
export function cancels(prev: number, next: number): number {
  return next === 0 || Math.sign(prev) !== Math.sign(next) ? Math.abs(prev) : 0;
}

/** The staff's bottom line as a diatonic step: E4 in treble, G2 in bass. */
export function bottomStep(clef: Clef): number {
  return clef === "bass" ? 2 * 7 + 4 : 4 * 7 + 2;
}

/** Where a tick sits along the bar's content, linear between the onsets either side of it. */
function offsetAt(tick: number, starts: number[], offs: number[], total: number, width: number): number {
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]!;
    const next = starts[i + 1] ?? total;
    if (tick >= s && tick < next) {
      const end = offs[i + 1] ?? width;
      return offs[i]! + ((tick - s) / (next - s)) * (end - offs[i]!);
    }
  }
  return width;
}

interface Prepared {
  bar: Bar;
  number: number;
  sectionId: string;
  sectionIndex: number;
  ctx: BarContext;
  events: RhythmEvent[];
  stemless: boolean;
  fellBack: boolean;
  notes?: NoteHeads[];
  /** Natural offsets of each event from content start, before stretching. */
  offs: number[];
  contentW: number;
  leftPad: number;
  rightPad: number;
  /** Width of a key or meter change drawn at the bar's start, when it is not at a system's start. */
  inlineW: number;
  chordTexts: Array<{ tick: number; text: string; w: number }>;
}

/** Room for an accidental before a notehead. */
const ACC_W = 1.3 * SP;

function prepare(song: Song, measure: Measure, view: ChordView): Prepared[] {
  const contexts = barContexts(song);
  return allBars(song).map(({ bar, section, number, ref }) => {
    const ctx = contexts.get(bar.id)!;
    const total = barTicks(ctx.time);
    let events: RhythmEvent[];
    let stemless = false;
    let fellBack = false;
    let notes: NoteHeads[] | undefined;
    const accBefore: number[] = [];
    if (bar.notes) {
      const shown = shownAccidentals(bar.notes, ctx);
      const written = writtenEvents(bar.notes, ctx.time);
      const base = bottomStep(song.clef);
      events = written.map((e) => ({ ticks: e.ticks, rest: e.rest, ...(e.tie ? { tie: true } : {}) }));
      // An accidental prints on the first written piece of a run only: the tied rest carries it.
      notes = written.map((e, i) => {
        const firstOfRun = i === 0 || written[i - 1]!.run !== e.run;
        const pitches = e.pitches.map((p, k) => ({
          pos: stepOf(writtenOf(p, ctx)) - base,
          acc: firstOfRun ? shown[e.run]?.[k] ?? null : null,
        }));
        accBefore.push(pitches.some((p) => p.acc !== null) ? ACC_W : 0);
        return { pitches };
      });
    } else {
      const r = barRhythm(patternById(song, barPatternId(section, bar)), bar.chords, ctx.time, bar.rhythm);
      events = r.events;
      stemless = r.stemless;
      fellBack = r.fellBack;
    }
    const starts = onsets(events);
    const natural: number[] = [];
    let acc = 0;
    events.forEach((e, i) => {
      acc += accBefore[i] ?? 0;
      natural.push(acc);
      acc += eventSpace(e.ticks);
    });
    const chordTexts = bar.chords.map((c) => {
      const text = barChordLabel(c, ctx.key, view);
      return { tick: c.tick, text, w: measure(text, SIZE.chord) };
    });
    let inlineW = 0;
    if (ctx.keyChanged) inlineW += keyWidth(fifths(ctx.key), cancels(fifths(ctx.prevKey), fifths(ctx.key)));
    if (ctx.timeChanged) inlineW += TIME_W;
    // Stretch the content until no chord symbol runs into the next one.
    const leftPad = (bar.repeatStart ? REPEAT_W : 0) + 1.1 * SP + inlineW;
    const rightPad = (bar.repeatEnd ? REPEAT_W : 0) + 0.6 * SP;
    let k = 1;
    chordTexts.forEach((c, i) => {
      const a = offsetAt(c.tick, starts, natural, total, acc);
      const nextTick = chordTexts[i + 1]?.tick;
      const b = nextTick === undefined ? acc + rightPad : offsetAt(nextTick, starts, natural, total, acc);
      const need = c.w + 0.8 * SP;
      if (b - a < need && b - a > 0) k = Math.max(k, need / (b - a));
    });
    const out: Prepared = {
      bar,
      number,
      sectionId: section.id,
      sectionIndex: ref.section,
      ctx,
      events,
      stemless,
      fellBack,
      offs: natural.map((o) => o * k),
      contentW: acc * k,
      leftPad,
      rightPad,
      inlineW,
      chordTexts,
    };
    if (notes) out.notes = notes;
    return out;
  });
}

function minWidth(p: Prepared): number {
  return p.leftPad + p.contentW + p.rightPad;
}

export function sectionLabel(name: string): string {
  const n = name.trim();
  return n.endsWith(":") ? n : `${n}:`;
}

/** Puts items into rows, outward from the staff, so that none overlap. */
function stackRows(items: RowItem[]): number {
  const ends: number[] = [];
  for (const it of [...items].sort((a, b) => a.x - b.x)) {
    let row = 0;
    while ((ends[row] ?? -Infinity) > it.x - 2) row++;
    it.row = row;
    ends[row] = it.x + it.w;
  }
  return ends.length;
}

const JUMP_TEXT: Record<Jump, string> = {
  toCoda: "To Coda",
  dsAlCoda: "D.S. al Coda",
  dcAlCoda: "D.C. al Coda",
  dcAlFine: "D.C. al Fine",
  fine: "Fine",
};
export function jumpText(j: Jump): string {
  return JUMP_TEXT[j];
}

export function layoutSong(song: Song, measure: Measure, view: ChordView = "letters"): PageLayout[] {
  const prepared = prepare(song, measure, view);
  const systems: SystemLayout[] = [];

  // Greedy line breaking within each section. A section always starts a system, as in the PDF.
  let i = 0;
  while (i < prepared.length) {
    const first = systems.length === 0;
    const sectionIndex = prepared[i]!.sectionIndex;
    const indent = first ? FIRST_INDENT : 0;
    // A system's header carries the key in force at its first bar, and the meter if this is the
    // first system or the meter changes on its first bar (the change is drawn there, not inline).
    const head = prepared[i]!.ctx;
    const sig = fifths(head.key);
    const time = first || head.timeChanged ? head.time : undefined;
    const headCancel = head.keyChanged && !first ? cancels(fifths(head.prevKey), sig) : 0;
    const headerW = headerWidth(song.clef, sig, time) + (headCancel ? headCancel * 1.05 * SP : 0);
    const startW = prepared[i]!.inlineW;
    const avail = CONTENT_W - indent - headerW;
    const line: Prepared[] = [];
    let used = 0;
    while (i < prepared.length && prepared[i]!.sectionIndex === sectionIndex) {
      // The first bar's change is in the header, so its inline room is not needed.
      const w = minWidth(prepared[i]!) - (line.length === 0 ? startW : 0);
      if (line.length > 0 && used + w > avail) break;
      if (line.length === MAX_BARS_PER_SYSTEM) break;
      line.push(prepared[i]!);
      used += w;
      i++;
    }
    const sectionStart = line[0]!.bar.id === song.sections[sectionIndex]!.bars[0]!.id;
    const section = song.sections[sectionIndex]!;

    // Justify: the spare width goes to the bars' content in proportion to it, never to the pads.
    const contentSum = line.reduce((a, p) => a + p.contentW, 0);
    const stretch = contentSum > 0 ? Math.max(0, avail - used) / contentSum : 0;
    let x = MARGIN_X + indent + headerW;
    const bars: BarLayout[] = line.map((p, li) => {
      const scale = 1 + stretch;
      const inlineW = li === 0 ? 0 : p.inlineW;
      const leftPad = p.leftPad - p.inlineW + inlineW;
      const w = leftPad + p.contentW * scale + p.rightPad;
      const contentX = x + leftPad;
      const starts = onsets(p.events);
      const total = barTicks(p.ctx.time);
      const events = p.events.map((e, j) => ({ x: contentX + p.offs[j]! * scale, ticks: e.ticks, rest: e.rest, tie: e.tie }));
      const xAt = (tick: number) => contentX + offsetAt(tick, starts, p.offs, total, p.contentW) * scale;
      const chords = p.chordTexts.map((c) => ({ x: xAt(c.tick), text: c.text }));
      const out: BarLayout = {
        xAt,
        ctx: p.ctx,
        bar: p.bar,
        number: p.number,
        sectionId: p.sectionId,
        x,
        w,
        contentX,
        events,
        stemless: p.stemless,
        fellBack: p.fellBack,
        beams: p.stemless ? [] : beamGroups(p.events, p.ctx.time),
        chords,
        endingStart: false,
        endingClosed: false,
        final: false,
        doubleBar: false,
      };
      if (p.notes) out.notes = p.notes;
      if (inlineW) {
        const inline: NonNullable<BarLayout["inline"]> = { x: x + (p.bar.repeatStart ? REPEAT_W : 0) + 0.6 * SP };
        if (p.ctx.keyChanged) {
          const f = fifths(p.ctx.key);
          const pf = fifths(p.ctx.prevKey);
          inline.key = { fifths: f, prevFifths: pf, cancel: cancels(pf, f) };
        }
        if (p.ctx.timeChanged) inline.time = p.ctx.time;
        out.inline = inline;
      }
      x += w;
      return out;
    });

    const above: RowItem[] = [];
    const below: RowItem[] = [];
    for (const b of bars) {
      const bar = b.bar;
      if (bar.marker) above.push({ kind: "marker", barId: bar.id, x: b.x, w: 3 * SP, row: 0, text: "", marker: bar.marker });
      if (bar.cueAbove) {
        const w = measure(bar.cueAbove, SIZE.cue) + 2 * BOX_PAD_X;
        above.push({ kind: "cue", barId: bar.id, x: b.contentX + (bar.marker ? 3.4 * SP : 0), w, row: 0, text: bar.cueAbove });
      }
      if (bar.jump) {
        const text = jumpText(bar.jump);
        const w = measure(text, SIZE.cue, { italic: true }) + (bar.jump === "toCoda" ? 3.4 * SP : 0);
        above.push({ kind: "jump", barId: bar.id, x: b.x + b.w - w - 0.3 * SP, w, row: 0, text });
      }
      if (bar.cueBelow) {
        below.push({ kind: "cue", barId: bar.id, x: b.contentX, w: measure(bar.cueBelow, SIZE.cue), row: 0, text: bar.cueBelow });
      }
      if (b.ctx.tempoChanged && !(first && b === bars[0])) {
        const text = `= ${b.ctx.tempo}`;
        above.push({ kind: "tempo", barId: bar.id, x: b.contentX, w: measure(text, SIZE.tempo + 1, { bold: true }) + 11, row: 0, text });
      }
      if (bar.repeatEnd && bar.repeatEnd.times > 2) {
        // The PDF prints "4x" in bold under the closing barline, right-aligned to it.
        const text = `${bar.repeatEnd.times}x`;
        const w = measure(text, SIZE.count, { bold: true });
        below.push({ kind: "count", barId: bar.id, x: b.x + b.w - w, w, row: 0, text });
      }
    }
    const boxRows = stackRows(above);
    const belowRows = stackRows(below);
    const hasVolta = bars.some((b) => b.bar.ending);
    const label = sectionStart ? sectionLabel(section.name) : undefined;
    const tempo = first ? head.tempo : undefined;
    // The tempo sits in the chord row, left of the first chord, as in his PDF, where five sharps
    // made room. In C the first chord starts right after the clef and the two collided ("♩ = 90C",
    // the sweep). When there is no room, the tempo goes up a row.
    const tempoEnd = MARGIN_X + indent + TEMPO_X + 9 + (tempo ? measure(`= ${tempo}`, SIZE.tempo + 1, { bold: true }) : 0) + (isCompound(head.time) ? 4 : 0);
    const firstChordX = bars[0]?.chords[0]?.x ?? Infinity;
    const tempoRaised = !!tempo && firstChordX < tempoEnd + 0.8 * SP;

    const aboveH =
      CHORD_ROW + (hasVolta ? VOLTA_ROW : 0) + boxRows * BOX_ROW + (tempo ? TEMPO_EXTRA : 0) + (tempoRaised ? TEMPO_RAISE : 0) +
      (label ? SIZE.label * 0.72 + LABEL_GAP : 0) + 2;
    const belowH = STAFF_H + Math.max(BELOW_MIN, belowRows ? BELOW_BASELINE + (belowRows - 1) * BELOW_ROW + 4 : 0);

    const sys: SystemLayout = {
      y: aboveH,
      top: 0,
      bottom: aboveH + belowH,
      x0: MARGIN_X + indent,
      x1: MARGIN_X + CONTENT_W,
      clef: song.clef,
      fifths: sig,
      headerW,
      cancel: headCancel ? { count: headCancel, prevFifths: fifths(head.prevKey) } : undefined,
      sectionId: section.id,
      bars,
      hasVolta,
      boxRows,
      belowRows,
      above,
      below,
    };
    if (time) sys.time = time;
    if (label) sys.label = label;
    if (tempo) {
      sys.tempo = tempo;
      sys.tempoRaise = tempoRaised ? TEMPO_RAISE + (hasVolta ? VOLTA_ROW : 0) + boxRows * BOX_ROW : 0;
      sys.tempoDotted = isCompound(head.time);
    }
    if (!first) sys.barNumber = bars[0]!.number;
    systems.push(sys);
  }

  // Endings: a bracket starts where the set of numbers changes, and closes on a repeat.
  const flat = systems.flatMap((s) => s.bars);
  flat.forEach((b, j) => {
    const key = b.bar.ending?.join(",");
    if (!key) return;
    b.endingStart = flat[j - 1]?.bar.ending?.join(",") !== key;
    const nextSame = flat[j + 1]?.bar.ending?.join(",") === key;
    b.endingClosed = !nextSame && !!b.bar.repeatEnd;
  });
  const last = flat[flat.length - 1];
  if (last && !last.bar.repeatEnd) last.final = true;
  flat.forEach((b, j) => {
    if (flat[j + 1]?.ctx.keyChanged && !b.bar.repeatEnd) b.doubleBar = true;
  });

  // Pages: systems are never split. One that does not fit starts the next page.
  const pages: PageLayout[] = [{ index: 0, systems: [] }];
  let cursor = PAGE1_CONTENT_TOP;
  for (const s of systems) {
    const h = s.bottom;
    let page = pages[pages.length - 1]!;
    if (page.systems.length > 0 && cursor + h > PAGE_H - MARGIN_BOTTOM) {
      page = { index: pages.length, systems: [] };
      pages.push(page);
      cursor = PAGEN_CONTENT_TOP;
    }
    s.top = cursor;
    s.y += cursor;
    s.bottom += cursor;
    page.systems.push(s);
    cursor = s.bottom + SYSTEM_GAP;
  }
  return pages;
}

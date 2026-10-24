/**
 * Draws one laid-out page as SVG in points. It draws only: everything it shows comes from
 * `layoutSong`, and nothing here is musical truth (non-negotiable 3).
 */
import type { ReactNode } from "react";
import { PPQ } from "../../core/ticks";
import type { BarLayout, PageLayout, SystemLayout } from "./layout";
import {
  BOX_H, BOX_PAD_X, BOX_ROW, CHORD_BASELINE, CHORD_ROW, GLYPH, LINE, MARGIN_X, MUSIC_FONT, MUSIC_SIZE,
  PAGE_NUMBER_BASELINE, PAGE_W, SIZE, SOURCE_BASELINE, SP, STAFF_H, TEXT_FONT, TITLE_BASELINE, VOLTA_ROW,
  BELOW_BASELINE, BELOW_ROW, LABEL_GAP, TEMPO_X,
} from "./metrics";

const INK = "var(--ink-score, #000)";

function Glyph({ x, y, g, size = MUSIC_SIZE }: { x: number; y: number; g: string; size?: number }) {
  return (
    <text x={x} y={y} fontFamily={MUSIC_FONT} fontSize={size} fill={INK}>
      {g}
    </text>
  );
}

function Text(props: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <text
      x={props.x}
      y={props.y}
      fontFamily={TEXT_FONT}
      fontSize={props.size}
      fontWeight={props.bold ? "bold" : undefined}
      fontStyle={props.italic ? "italic" : undefined}
      textAnchor={props.anchor}
      fill={INK}
    >
      {props.children}
    </text>
  );
}

/** Staff positions in half-spaces down from the top line. Treble: F5 C5 G5 D5 A4 E5 B4 for sharps,
 * B4 E5 A4 D5 G4 C5 F4 for flats. Bass is the same shape two steps lower. */
const SHARP_STEPS = [0, 3, -1, 2, 5, 1, 4];
const FLAT_STEPS = [4, 1, 5, 2, 6, 3, 7];

/** A key signature from `x`, with `cancel` naturals for the old one first. Returns its width. */
function keySig(out: ReactNode[], k: string, x: number, y: number, clef: SystemLayout["clef"], f: number, cancel = 0, prev = 0): number {
  const shift = clef === "bass" ? 2 : 0;
  let cx = x;
  const prevSteps = prev > 0 ? SHARP_STEPS : FLAT_STEPS;
  for (let i = 0; i < cancel; i++) {
    out.push(<Glyph key={`${k}n${i}`} x={cx} y={y + ((prevSteps[i]! + shift) * SP) / 2} g={GLYPH.natural} />);
    cx += 1.05 * SP;
  }
  const steps = f > 0 ? SHARP_STEPS : FLAT_STEPS;
  for (let i = 0; i < Math.abs(f); i++) {
    out.push(<Glyph key={`${k}k${i}`} x={cx} y={y + ((steps[i]! + shift) * SP) / 2} g={f > 0 ? GLYPH.sharp : GLYPH.flat} />);
    cx += 1.05 * SP;
  }
  return cx - x + (cx > x ? 0.8 * SP : 0);
}

function timeSig(out: ReactNode[], k: string, x: number, y: number, t: { beats: number; unit: number }) {
  const num = String(t.beats);
  const den = String(t.unit);
  const digitW = 1.75 * SP;
  const w = Math.max(num.length, den.length) * digitW;
  const put = (str: string, yy: number, kk: string) =>
    [...str].map((d, i) => <Glyph key={`${k}${kk}${i}`} x={x + (w - str.length * digitW) / 2 + i * digitW} y={yy} g={GLYPH.timeSig(Number(d))} />);
  out.push(...put(num, y + SP, "n"), ...put(den, y + 3 * SP, "d"));
}

function Header({ s }: { s: SystemLayout }) {
  const out: ReactNode[] = [];
  const clefX = s.x0 + 0.6 * SP;
  const clefGlyph = s.clef === "bass" ? GLYPH.fClef : s.clef === "treble" ? GLYPH.gClef : GLYPH.gClef8vb;
  const clefY = s.clef === "bass" ? s.y + SP : s.y + 3 * SP;
  out.push(<Glyph key="clef" x={clefX} y={clefY} g={clefGlyph} />);
  let x = clefX + 2.56 * SP + 0.9 * SP;
  x += keySig(out, "h", x, s.y, s.clef, s.fifths, s.cancel?.count ?? 0, s.cancel?.prevFifths ?? 0);
  if (s.time) timeSig(out, "ht", x, s.y, s.time);
  return <>{out}</>;
}

/** A key or meter change inside a system (decision 7). */
function Inline({ b, s }: { b: BarLayout; s: SystemLayout }) {
  if (!b.inline) return null;
  const out: ReactNode[] = [];
  let x = b.inline.x;
  if (b.inline.key) x += keySig(out, `i${b.bar.id}`, x, s.y, s.clef, b.inline.key.fifths, b.inline.key.cancel, b.inline.key.prevFifths);
  if (b.inline.time) timeSig(out, `it${b.bar.id}`, x, s.y, b.inline.time);
  return <>{out}</>;
}

function restGlyph(base: number): string {
  if (base >= PPQ * 4) return GLYPH.restWhole;
  if (base >= PPQ * 2) return GLYPH.restHalf;
  if (base >= PPQ) return GLYPH.restQuarter;
  if (base >= PPQ / 2) return GLYPH.rest8th;
  if (base >= PPQ / 4) return GLYPH.rest16th;
  return GLYPH.rest32nd;
}

/** A dotted value's undotted base: 1440 → 960. */
function baseOf(ticks: number): { base: number; dotted: boolean } {
  const pow = Math.log2((ticks * 2) / 3 / 60);
  if (Number.isInteger(pow)) return { base: (ticks * 2) / 3, dotted: true };
  return { base: ticks, dotted: false };
}

/** Slash geometry, read off the PDF: from the 4th line down to the 2nd, about 1.5 sp across. */
const SLASH_W = 1.55 * SP;
const SLASH_T = 0.62 * SP;
const STEM_END = 5.5 * SP;

function Bar({ b, s }: { b: BarLayout; s: SystemLayout }) {
  if (b.notes) return <NoteBar b={b} s={s} />;
  const out: ReactNode[] = [];
  const yTop = s.y + SP;
  const yBot = s.y + 3 * SP;
  const stemEnd = s.y + STEM_END;
  const beamed = new Set<number>();
  for (const [a, z] of b.beams) for (let i = a; i <= z; i++) beamed.add(i);

  b.events.forEach((e, i) => {
    const { base, dotted } = baseOf(e.ticks);
    if (e.rest) {
      const y = base >= PPQ * 4 ? s.y + SP : s.y + 2 * SP;
      out.push(<Glyph key={`r${i}`} x={e.x + 0.1 * SP} y={y} g={restGlyph(base)} />);
      if (dotted) out.push(<Glyph key={`rd${i}`} x={e.x + 1.6 * SP} y={s.y + 1.5 * SP} g={GLYPH.dot} />);
      return;
    }
    const filled = base <= PPQ;
    if (filled) {
      out.push(
        <path
          key={`n${i}`}
          d={`M${e.x},${yBot} L${e.x + SLASH_T},${yBot} L${e.x + SLASH_W},${yTop} L${e.x + SLASH_W - SLASH_T},${yTop} Z`}
          fill={INK}
        />,
      );
    } else {
      const t = 1.0 * SP;
      const w = 1.9 * SP;
      out.push(
        <path
          key={`n${i}`}
          d={`M${e.x},${yBot} L${e.x + t},${yBot} L${e.x + w},${yTop} L${e.x + w - t},${yTop} Z`}
          fill="none"
          stroke={INK}
          strokeWidth={0.16 * SP}
          strokeLinejoin="miter"
        />,
      );
    }
    if (dotted) out.push(<Glyph key={`d${i}`} x={e.x + SLASH_W + 0.45 * SP} y={s.y + 1.5 * SP} g={GLYPH.dot} />);
    if (b.stemless || base >= PPQ * 4) return;
    const sx = e.x + LINE.stem / 2;
    out.push(<line key={`s${i}`} x1={sx} y1={yBot} x2={sx} y2={stemEnd} stroke={INK} strokeWidth={LINE.stem} />);
    if (!beamed.has(i) && base < PPQ) {
      const flag = base >= PPQ / 2 ? GLYPH.flag8thDown : base >= PPQ / 4 ? GLYPH.flag16thDown : GLYPH.flag32ndDown;
      out.push(<Glyph key={`f${i}`} x={e.x} y={stemEnd} g={flag} />);
    }
  });

  // Ties (decision 6: a strum that rings across a beat is written as two tied values). Stems are
  // down, so the tie curves above the slashes, from the middle of one to the middle of the next.
  b.events.forEach((e, i) => {
    const next = b.events[i + 1];
    if (!e.tie || !next) return;
    const x1 = e.x + SLASH_W * 0.75;
    const x2 = next.x + SLASH_W * 0.35;
    const y = yTop - 0.35 * SP;
    const mx = (x1 + x2) / 2;
    out.push(
      <path key={`t${i}`} d={`M${x1},${y} Q${mx},${y - 1.25 * SP} ${x2},${y} Q${mx},${y - 0.95 * SP} ${x1},${y} Z`} fill={INK} />,
    );
  });

  for (const [a, z] of b.beams) {
    const x1 = b.events[a]!.x;
    const x2 = b.events[z]!.x + LINE.stem;
    out.push(<rect key={`bm${a}`} x={x1} y={stemEnd - LINE.beam} width={x2 - x1} height={LINE.beam} fill={INK} />);
    // 16ths: a second beam joins neighbouring 16ths, and a lone one gets a stub toward its neighbour.
    const y2 = stemEnd - 2 * LINE.beam - LINE.beamGap;
    for (let i = a; i <= z; i++) {
      if (baseOf(b.events[i]!.ticks).base > PPQ / 4) continue;
      const nextIs16 = i < z && baseOf(b.events[i + 1]!.ticks).base <= PPQ / 4;
      const prevIs16 = i > a && baseOf(b.events[i - 1]!.ticks).base <= PPQ / 4;
      const xi = b.events[i]!.x;
      if (nextIs16) {
        out.push(<rect key={`b2${i}`} x={xi} y={y2} width={b.events[i + 1]!.x + LINE.stem - xi} height={LINE.beam} fill={INK} />);
      } else if (!prevIs16) {
        const stub = 1.1 * SP;
        const left = i === z;
        out.push(<rect key={`b2${i}`} x={left ? xi - stub + LINE.stem : xi} y={y2} width={stub} height={LINE.beam} fill={INK} />);
      }
    }
  }

  b.chords.forEach((c, i) => (
    out.push(<Text key={`c${i}`} x={c.x} y={s.y - CHORD_BASELINE} size={SIZE.chord}>{c.text}</Text>)
  ));
  return <g data-bar={b.bar.id}>{out}</g>;
}

/*
 * Written notes (decision 8). Engraving rules, each from common practice as given in Gould's *Behind
 * Bars* or plainly inference:
 * - Stems: up below the middle line, down on or above it. A beamed group follows its note furthest
 *   from the middle (Gould, "Stems").
 * - Stems are 3.5 spaces from the end note. A beam lies flat at the group's extreme: inference, as
 *   with the slashes, since his PDF's beams are flat.
 * - Ledger lines extend 0.35 sp either side of the head (Leland's legerLineExtension).
 * - In a chord, a second is set on the other side of the stem.
 * - Accidentals sit 1.3 sp before the head and stagger in a chord. Dots go in the space above a
 *   line note.
 */
const HEAD_W = 1.18 * SP;
const ACC_GLYPH: Record<number, string> = { [-2]: GLYPH.doubleFlat, [-1]: GLYPH.flat, 0: GLYPH.natural, 1: GLYPH.sharp, 2: GLYPH.doubleSharp };

function NoteBar({ b, s }: { b: BarLayout; s: SystemLayout }) {
  const out: ReactNode[] = [];
  const yOf = (pos: number) => s.y + STAFF_H - (pos * SP) / 2;
  const notes = b.notes!;
  // Stem direction per event: beamed groups share one.
  const up: boolean[] = notes.map((n) => {
    const far = n.pitches.reduce((m, p) => (Math.abs(p.pos - 4) > Math.abs(m - 4) ? p.pos : m), 4);
    return far < 4;
  });
  for (const [a, z] of b.beams) {
    let far = 4;
    for (let i = a; i <= z; i++) for (const p of notes[i]!.pitches) if (Math.abs(p.pos - 4) > Math.abs(far - 4)) far = p.pos;
    for (let i = a; i <= z; i++) up[i] = far < 4;
  }
  const inBeam = new Map<number, [number, number]>();
  for (const g of b.beams) for (let i = g[0]; i <= g[1]; i++) inBeam.set(i, g);
  const stemX = (i: number) => b.events[i]!.x + (up[i] ? HEAD_W - LINE.stem / 2 : LINE.stem / 2);
  const tipOf = (i: number) => {
    const ps = notes[i]!.pitches.map((p) => yOf(p.pos));
    return up[i] ? Math.min(...ps) - 3.5 * SP : Math.max(...ps) + 3.5 * SP;
  };
  const beamY = new Map<string, number>();
  for (const [a, z] of b.beams) {
    const tips: number[] = [];
    for (let i = a; i <= z; i++) tips.push(tipOf(i));
    beamY.set(`${a}`, up[a] ? Math.min(...tips) : Math.max(...tips));
  }

  b.events.forEach((e, i) => {
    const { base, dotted } = baseOf(e.ticks);
    if (e.rest) {
      const y = base >= PPQ * 4 ? s.y + SP : s.y + 2 * SP;
      out.push(<Glyph key={`r${i}`} x={e.x + 0.1 * SP} y={y} g={restGlyph(base)} />);
      if (dotted) out.push(<Glyph key={`rd${i}`} x={e.x + 1.6 * SP} y={s.y + 1.5 * SP} g={GLYPH.dot} />);
      return;
    }
    const n = notes[i]!;
    const head = base >= PPQ * 4 ? GLYPH.noteWhole : base >= PPQ * 2 ? GLYPH.noteHalf : GLYPH.noteBlack;
    const sorted = [...n.pitches].sort((p, q) => p.pos - q.pos);
    // Seconds in a chord: every other head of a run of adjacent steps flips across the stem.
    const flip = new Set<number>();
    for (let k = 1; k < sorted.length; k++) {
      if (sorted[k]!.pos - sorted[k - 1]!.pos === 1 && !flip.has(k - 1)) flip.add(up[i] ? k : k - 1);
    }
    let accOffset = 0;
    sorted.forEach((p, k) => {
      const hx = e.x + (flip.has(k) ? (up[i] ? HEAD_W - LINE.stem : -HEAD_W + LINE.stem) : 0);
      const y = yOf(p.pos);
      // Ledger lines, from the staff out to this note.
      for (let l = -2; l >= p.pos; l -= 2) {
        out.push(<line key={`lb${i}.${k}.${l}`} x1={hx - 0.35 * SP} x2={hx + HEAD_W + 0.35 * SP} y1={yOf(l)} y2={yOf(l)} stroke={INK} strokeWidth={0.16 * SP} />);
      }
      for (let l = 10; l <= p.pos; l += 2) {
        out.push(<line key={`la${i}.${k}.${l}`} x1={hx - 0.35 * SP} x2={hx + HEAD_W + 0.35 * SP} y1={yOf(l)} y2={yOf(l)} stroke={INK} strokeWidth={0.16 * SP} />);
      }
      out.push(<Glyph key={`h${i}.${k}`} x={hx} y={y} g={head} />);
      if (p.acc !== null) {
        out.push(<Glyph key={`a${i}.${k}`} x={e.x - 1.3 * SP - accOffset} y={y} g={ACC_GLYPH[p.acc] ?? GLYPH.natural} />);
        accOffset = accOffset ? 0 : 1.1 * SP;
      }
      if (dotted) out.push(<Glyph key={`d${i}.${k}`} x={e.x + HEAD_W + 0.4 * SP} y={p.pos % 2 === 0 ? y - SP / 2 : y} g={GLYPH.dot} />);
      // A tie to the same pitch in the next event, curved away from the stem.
      const next = notes[i + 1];
      // A tie to the same pitch in the next event, or, from the bar's last note, on to the barline:
      // the tie carries into the next bar.
      const intoNext = e.tie && i === b.events.length - 1;
      if (intoNext || (e.tie && next && next.pitches.some((q) => q.pos === p.pos) && b.events[i + 1])) {
        const x1 = hx + HEAD_W;
        const x2 = intoNext ? b.x + b.w - 0.4 * SP : b.events[i + 1]!.x;
        const dir = up[i] ? 1 : -1;
        const yy = y + dir * 0.6 * SP;
        const mx = (x1 + x2) / 2;
        out.push(<path key={`t${i}.${k}`} d={`M${x1},${yy} Q${mx},${yy + dir * 1.2 * SP} ${x2},${yy} Q${mx},${yy + dir * 0.9 * SP} ${x1},${yy} Z`} fill={INK} />);
      }
    });
    if (base >= PPQ * 4) return;
    const sx = stemX(i);
    const ends = sorted.map((p) => yOf(p.pos));
    const from = up[i] ? Math.max(...ends) : Math.min(...ends);
    const g = inBeam.get(i);
    const to = g ? beamY.get(`${g[0]}`)! : tipOf(i);
    out.push(<line key={`s${i}`} x1={sx} y1={from} x2={sx} y2={to} stroke={INK} strokeWidth={LINE.stem} />);
    if (!g && base < PPQ) {
      const flag = up[i]
        ? base >= PPQ / 2 ? GLYPH.flag8thUp : base >= PPQ / 4 ? GLYPH.flag16thUp : GLYPH.flag32ndUp
        : base >= PPQ / 2 ? GLYPH.flag8thDown : base >= PPQ / 4 ? GLYPH.flag16thDown : GLYPH.flag32ndDown;
      out.push(<Glyph key={`f${i}`} x={sx - LINE.stem / 2} y={to} g={flag} />);
    }
  });

  for (const [a, z] of b.beams) {
    const y = beamY.get(`${a}`)!;
    const x1 = stemX(a) - LINE.stem / 2;
    const x2 = stemX(z) + LINE.stem / 2;
    const dir = up[a] ? 1 : -1;
    const by = up[a] ? y : y - LINE.beam;
    out.push(<rect key={`bm${a}`} x={x1} y={by} width={x2 - x1} height={LINE.beam} fill={INK} />);
    const y2 = by + dir * (LINE.beam + LINE.beamGap);
    for (let i = a; i <= z; i++) {
      if (baseOf(b.events[i]!.ticks).base > PPQ / 4) continue;
      const nextIs16 = i < z && baseOf(b.events[i + 1]!.ticks).base <= PPQ / 4;
      const prevIs16 = i > a && baseOf(b.events[i - 1]!.ticks).base <= PPQ / 4;
      const xi = stemX(i) - LINE.stem / 2;
      if (nextIs16) {
        out.push(<rect key={`b2${i}`} x={xi} y={y2} width={stemX(i + 1) + LINE.stem / 2 - xi} height={LINE.beam} fill={INK} />);
      } else if (!prevIs16) {
        const stub = 1.1 * SP;
        out.push(<rect key={`b2${i}`} x={i === z ? xi - stub + LINE.stem : xi} y={y2} width={stub} height={LINE.beam} fill={INK} />);
      }
    }
  }

  b.chords.forEach((c, i) => out.push(<Text key={`c${i}`} x={c.x} y={s.y - CHORD_BASELINE} size={SIZE.chord}>{c.text}</Text>));
  return <g data-bar={b.bar.id}>{out}</g>;
}

function Barlines({ s }: { s: SystemLayout }) {
  const out: ReactNode[] = [];
  const top = s.y;
  const bot = s.y + STAFF_H;
  const v = (x: number, w: number, k: string) => (
    <rect key={k} x={x} y={top - LINE.staff / 2} width={w} height={STAFF_H + LINE.staff} fill={INK} />
  );
  const dots = (x: number, k: string) => [
    <Glyph key={`${k}a`} x={x} y={top + 1.5 * SP} g={GLYPH.repeatDot} />,
    <Glyph key={`${k}b`} x={x} y={top + 2.5 * SP} g={GLYPH.repeatDot} />,
  ];
  s.bars.forEach((b, i) => {
    const x = b.x;
    const xe = b.x + b.w;
    if (b.bar.repeatStart) {
      out.push(v(x, LINE.thick, `rs${i}`));
      const tx = x + LINE.thick + LINE.barlineSep;
      out.push(v(tx, LINE.thin, `rt${i}`));
      out.push(...dots(tx + LINE.thin + LINE.barlineSep, `rd${i}`));
    }
    if (b.bar.repeatEnd) {
      out.push(v(xe - LINE.thick, LINE.thick, `re${i}`));
      const tx = xe - LINE.thick - LINE.barlineSep - LINE.thin;
      out.push(v(tx, LINE.thin, `ret${i}`));
      out.push(...dots(tx - LINE.barlineSep - 0.42 * SP, `red${i}`));
    } else if (b.final) {
      out.push(v(xe - LINE.thick, LINE.thick, `fe${i}`));
      out.push(v(xe - LINE.thick - LINE.barlineSep - LINE.thin, LINE.thin, `ft${i}`));
    } else if (b.doubleBar) {
      // A double bar before a key change (Gould, "Key signatures": the change is marked by one).
      out.push(v(xe - LINE.thin, LINE.thin, `db${i}`));
      out.push(v(xe - 2 * LINE.thin - LINE.barlineSep, LINE.thin, `dc${i}`));
    } else if (!s.bars[i + 1]?.bar.repeatStart) {
      out.push(v(xe - LINE.thin, LINE.thin, `b${i}`));
    }
  });
  void bot;
  return <>{out}</>;
}

function Volta({ s }: { s: SystemLayout }) {
  if (!s.hasVolta) return null;
  const y = s.y - CHORD_ROW - VOLTA_ROW + 3;
  const out: ReactNode[] = [];
  s.bars.forEach((b, i) => {
    const e = b.bar.ending;
    if (!e) return;
    const x1 = b.x + (b.endingStart ? 0.5 * SP : 0);
    const x2 = b.x + b.w - (b.endingClosed ? 0.5 * SP : 0);
    out.push(<line key={`v${i}`} x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={LINE.volta} />);
    if (b.endingStart) {
      out.push(<line key={`vs${i}`} x1={x1} y1={y} x2={x1} y2={y + 2.6 * SP} stroke={INK} strokeWidth={LINE.volta} />);
      out.push(<Text key={`vn${i}`} x={x1 + 0.6 * SP} y={y + 9} size={SIZE.cue}>{e.join(", ") + "."}</Text>);
    }
    if (b.endingClosed) {
      out.push(<line key={`ve${i}`} x1={x2} y1={y} x2={x2} y2={y + 2.6 * SP} stroke={INK} strokeWidth={LINE.volta} />);
    }
  });
  return <>{out}</>;
}

export function boxBottom(s: SystemLayout, row: number): number {
  return s.y - CHORD_ROW - (s.hasVolta ? VOLTA_ROW : 0) - row * BOX_ROW - 1;
}

export function belowBaseline(s: SystemLayout, row: number): number {
  return s.y + STAFF_H + BELOW_BASELINE + row * BELOW_ROW;
}

export function labelBaseline(s: SystemLayout): number {
  return s.top + 2 + SIZE.label * 0.72;
}

function Rows({ s }: { s: SystemLayout }) {
  const out: ReactNode[] = [];
  s.above.forEach((it, i) => {
    const bb = boxBottom(s, it.row);
    if (it.kind === "cue") {
      out.push(
        <rect key={`ab${i}`} x={it.x} y={bb - BOX_H} width={it.w} height={BOX_H} fill="none" stroke={INK} strokeWidth={LINE.enclosure} />,
        <Text key={`at${i}`} x={it.x + BOX_PAD_X} y={bb - 4.2} size={SIZE.cue}>{it.text}</Text>,
      );
    } else if (it.kind === "marker") {
      out.push(<Glyph key={`am${i}`} x={it.x} y={bb - 2} g={it.marker === "coda" ? GLYPH.coda : GLYPH.segno} />);
    } else if (it.kind === "tempo") {
      out.push(
        <Glyph key={`tm${i}`} x={it.x} y={bb - 3} g={GLYPH.metQuarter} size={13} />,
        <Text key={`tt${i}`} x={it.x + 9} y={bb - 3} size={SIZE.tempo + 1} bold>{it.text}</Text>,
      );
    } else if (it.kind === "jump") {
      out.push(<Text key={`aj${i}`} x={it.x} y={bb - 4.2} size={SIZE.cue} italic>{it.text}</Text>);
      if (it.text === "To Coda") {
        out.push(<Glyph key={`ajc${i}`} x={it.x + it.w - 3 * SP} y={bb - 2} g={GLYPH.coda} />);
      }
    }
  });
  s.below.forEach((it, i) => {
    out.push(
      <Text key={`bl${i}`} x={it.x} y={belowBaseline(s, it.row)} size={it.kind === "count" ? SIZE.count : SIZE.cue} bold={it.kind === "count"}>
        {it.text}
      </Text>,
    );
  });
  return <>{out}</>;
}

function System({ s }: { s: SystemLayout }) {
  return (
    <g>
      {s.label && (
        <Text x={MARGIN_X} y={labelBaseline(s)} size={SIZE.label}>{s.label}</Text>
      )}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={s.x0} y1={s.y + i * SP} x2={s.x1} y2={s.y + i * SP} stroke={INK} strokeWidth={LINE.staff} />
      ))}
      <Header s={s} />
      {s.tempo !== undefined && (
        <g>
          <Glyph x={s.x0 + TEMPO_X} y={s.y - CHORD_BASELINE - (s.tempoRaise ?? 0)} g={GLYPH.metQuarter} size={13} />
          {s.tempoDotted && <Glyph x={s.x0 + TEMPO_X + 8} y={s.y - CHORD_BASELINE - (s.tempoRaise ?? 0)} g={GLYPH.metDot} size={13} />}
          <Text x={s.x0 + TEMPO_X + (s.tempoDotted ? 13 : 9)} y={s.y - CHORD_BASELINE - (s.tempoRaise ?? 0)} size={SIZE.tempo + 1} bold>{`= ${s.tempo}`}</Text>
        </g>
      )}
      {s.barNumber !== undefined && (
        <Text x={s.x0} y={s.y - 3.6} size={SIZE.barNumber} italic>{s.barNumber}</Text>
      )}
      <Volta s={s} />
      <Rows s={s} />
      {s.bars.map((b) => <Bar key={b.bar.id} b={b} s={s} />)}
      {s.bars.map((b) => <Inline key={`in${b.bar.id}`} b={b} s={s} />)}
      <Barlines s={s} />
    </g>
  );
}

export const LABEL_HEIGHT = SIZE.label * 0.72 + LABEL_GAP;

export function Notation({ page, title, source }: { page: PageLayout; title: string; source: string }) {
  const n = page.index + 1;
  return (
    <g>
      {page.index === 0 ? (
        <>
          <Text x={PAGE_W / 2} y={TITLE_BASELINE} size={SIZE.title} anchor="middle">{title}</Text>
          <Text x={PAGE_W - MARGIN_X} y={SOURCE_BASELINE} size={SIZE.source} anchor="end">{source}</Text>
        </>
      ) : (
        // The PDF puts 2 on the left and 3 on the right: facing pages.
        <Text x={n % 2 === 0 ? MARGIN_X : PAGE_W - MARGIN_X} y={PAGE_NUMBER_BASELINE} size={SIZE.pageNumber} anchor={n % 2 === 0 ? "start" : "end"} bold>
          {n}
        </Text>
      )}
      {page.systems.map((s) => <System key={s.bars[0]!.bar.id} s={s} />)}
    </g>
  );
}

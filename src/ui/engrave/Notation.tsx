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
  BELOW_BASELINE, BELOW_ROW, LABEL_GAP,
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

function Header({ s }: { s: SystemLayout }) {
  const out: ReactNode[] = [];
  const clefX = s.x0 + 0.6 * SP;
  const clefGlyph = s.clef === "bass" ? GLYPH.fClef : s.clef === "treble" ? GLYPH.gClef : GLYPH.gClef8vb;
  const clefY = s.clef === "bass" ? s.y + SP : s.y + 3 * SP;
  out.push(<Glyph key="clef" x={clefX} y={clefY} g={clefGlyph} />);
  let x = clefX + 2.56 * SP + 0.9 * SP;
  const n = Math.abs(s.fifths);
  const steps = s.fifths > 0 ? SHARP_STEPS : FLAT_STEPS;
  const shift = s.clef === "bass" ? 2 : 0;
  for (let i = 0; i < n; i++) {
    out.push(
      <Glyph key={`k${i}`} x={x + i * 1.05 * SP} y={s.y + ((steps[i]! + shift) * SP) / 2} g={s.fifths > 0 ? GLYPH.sharp : GLYPH.flat} />,
    );
  }
  x += n * 1.05 * SP + (n ? 0.8 * SP : 0);
  if (s.time) {
    const num = String(s.time.beats);
    const den = String(s.time.unit);
    const digitW = 1.75 * SP;
    const w = Math.max(num.length, den.length) * digitW;
    const put = (str: string, y: number, k: string) =>
      [...str].map((d, i) => (
        <Glyph key={`${k}${i}`} x={x + (w - str.length * digitW) / 2 + i * digitW} y={y} g={GLYPH.timeSig(Number(d))} />
      ));
    out.push(...put(num, s.y + SP, "tn"), ...put(den, s.y + 3 * SP, "td"));
  }
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
          <Glyph x={s.x0 + 1.8 * SP} y={s.y - CHORD_BASELINE} g={GLYPH.metQuarter} size={13} />
          <Text x={s.x0 + 1.8 * SP + 9} y={s.y - CHORD_BASELINE} size={SIZE.tempo + 1} bold>{`= ${s.tempo}`}</Text>
        </g>
      )}
      {s.barNumber !== undefined && (
        <Text x={s.x0} y={s.y - 3.6} size={SIZE.barNumber} italic>{s.barNumber}</Text>
      )}
      <Volta s={s} />
      <Rows s={s} />
      {s.bars.map((b) => <Bar key={b.bar.id} b={b} s={s} />)}
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

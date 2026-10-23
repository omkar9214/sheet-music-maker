/**
 * The pages, drawn as they print, with one target per bar.
 *
 * Omkar, decision 5: *"clicking the bar opens chords and chord area also opens chords, and in
 * genral its clunky"*. The first version had three overlapping targets per bar, and every click
 * opened a box and a palette. Now a click **selects** (shift-click extends), as a measure does in
 * iReal Pro and a cell does in a spreadsheet. Typing a chord letter, Enter or a double-click opens
 * chord entry in the bar, and Enter/Tab carries it to the next bar, as Dorico's chord popover does.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Song } from "../core/song";
import type { BarLayout, PageLayout, SystemLayout } from "./engrave/layout";
import {
  BELOW_BASELINE, BELOW_ROW, BOX_ROW, CHORD_ROW, MARGIN_X, PAGE_H, PAGE_W, SIZE, SOURCE_BASELINE,
  STAFF_H, TEXT_FONT, TITLE_BASELINE, VOLTA_ROW,
} from "./engrave/metrics";
import { Notation } from "./engrave/Notation";
import { currentToken, replaceToken, suggest } from "./suggest";

/**
 * Screen pixels per point. 1.3 makes the page 796 px wide, so the Form panel, the page and the
 * inspector fit side by side on a 1366-px laptop. A narrower window scrolls rather than shrinking
 * the page (non-negotiable 7).
 */
export const SCALE = 1.3;

export type Zone = "above" | "chord" | "below";

export interface Entry {
  barId: string;
  /** Typed to open it: the box starts with this text. Absent: it starts with the bar's chords, selected. */
  seed?: string;
}

interface Props {
  song: Song;
  pages: PageLayout[];
  selected: ReadonlySet<string>;
  focus: string | null;
  entry: Entry | null;
  editingMeta: "title" | "source" | null;
  onPress: (barId: string, extend: boolean) => void;
  onOpen: (barId: string, zone: Zone) => void;
  chordText: (barId: string) => string;
  /** Returns an error to keep the box open, or null once stored. */
  onCommitChords: (barId: string, value: string, move: 1 | -1 | 0) => string | null;
  onCancelEntry: () => void;
  onEditMeta: (which: "title" | "source" | null) => void;
  onCommitMeta: (which: "title" | "source", value: string) => void;
}

/** A bar's whole column, from its highest row above to its lowest below: one target, no overlaps. */
function barColumn(s: SystemLayout, b: BarLayout) {
  const top = s.y - CHORD_ROW - (s.hasVolta ? VOLTA_ROW : 0) - s.boxRows * BOX_ROW - 2;
  const bottom = s.y + STAFF_H + (s.belowRows ? BELOW_BASELINE + (s.belowRows - 1) * BELOW_ROW + 4 : 10);
  return { x: b.x, y: top, w: b.w, h: bottom - top };
}

function zoneAt(s: SystemLayout, yPt: number): Zone {
  if (yPt < s.y - CHORD_ROW - (s.hasVolta ? VOLTA_ROW : 0)) return "above";
  if (yPt > s.y + STAFF_H + 3) return "below";
  return "chord";
}

function locate(pages: PageLayout[], id: string) {
  for (const p of pages)
    for (const s of p.systems) {
      const b = s.bars.find((x) => x.bar.id === id);
      if (b) return { page: p.index, s, b };
    }
  return null;
}

function ChordEntry(props: {
  song: Song;
  initial: string;
  selectAll: boolean;
  left: number;
  top: number;
  width: number;
  onCommit: (value: string, move: 1 | -1 | 0) => string | null;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(props.initial);
  const [err, setErr] = useState<string | null>(null);
  const [hi, setHi] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const token = currentToken(value);
  // A suggestion that only repeats what is typed is noise.
  const list = suggest(props.song, token, 7).filter((t) => t !== token);

  // Mounted with its text and focused in the same commit, so no keystroke lands nowhere (the lost
  // cue found while verifying decision 3's build).
  useLayoutEffect(() => {
    alive.current = true;
    const el = input.current;
    if (el) {
      el.focus();
      if (props.selectAll) el.select();
      else el.setSelectionRange(el.value.length, el.value.length);
    }
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setHi(-1), [token]);

  const commit = (move: 1 | -1 | 0, v = value) => {
    const e = props.onCommit(v, move);
    setErr(e);
    return e;
  };
  const accept = (t: string) => {
    const v = replaceToken(value, t);
    setValue(v);
    setErr(null);
    setHi(-1);
    return v;
  };
  const onKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "ArrowDown" && list.length) {
      ev.preventDefault();
      setHi((h) => Math.min(list.length - 1, h + 1));
    } else if (ev.key === "ArrowUp" && list.length) {
      ev.preventDefault();
      setHi((h) => Math.max(-1, h - 1));
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      // A highlighted suggestion is taken into the box; otherwise Enter stores the bar and moves on.
      if (hi >= 0 && list[hi]) accept(list[hi]!);
      else commit(ev.shiftKey ? -1 : 1);
    } else if (ev.key === "Tab") {
      ev.preventDefault();
      const v = hi >= 0 && list[hi] ? accept(list[hi]!) : value;
      commit(ev.shiftKey ? -1 : 1, v);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      props.onCancel();
    }
  };
  return (
    <div className="entry" style={{ left: props.left, top: props.top, width: props.width }}>
      <input
        ref={input}
        className={err ? "entry-input invalid" : "entry-input"}
        style={{ fontFamily: TEXT_FONT, fontSize: SIZE.chord * SCALE }}
        value={value}
        spellCheck={false}
        autoComplete="off"
        aria-label="Chords"
        onChange={(e) => {
          setValue(e.target.value);
          setErr(null);
        }}
        onKeyDown={onKey}
        onBlur={() => {
          if (!alive.current) return;
          if (commit(0) !== null) props.onCancel();
        }}
      />
      {err ? (
        <div className="entry-error">{err}</div>
      ) : (
        list.length > 0 && (
          <ul className="suggest" onMouseDown={(e) => e.preventDefault()}>
            {list.map((t, i) => (
              // mousemove, not mouseenter: the list opens under a resting pointer, and mouseenter
              // then stole the highlight, so ↓ Enter took the second suggestion (found driving it).
              <li key={t} className={i === hi ? "on" : ""} onMouseMove={() => hi !== i && setHi(i)} onClick={() => accept(t)}>
                {t}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function MetaEdit(props: {
  initial: string;
  left: number;
  top: number;
  width: number;
  size: number;
  align: "center" | "right";
  onDone: (v: string | null) => void;
}) {
  const [v, setV] = useState(props.initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useLayoutEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (x: string | null) => {
    if (done.current) return;
    done.current = true;
    props.onDone(x);
  };
  return (
    <input
      ref={ref}
      className="meta-input"
      style={{ left: props.left, top: props.top, width: props.width, fontFamily: TEXT_FONT, fontSize: props.size * SCALE, textAlign: props.align }}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(v);
        if (e.key === "Escape") finish(null);
      }}
      onBlur={() => finish(v)}
    />
  );
}

export function Sheet(props: Props) {
  const { pages, song, selected, focus, entry } = props;
  const root = useRef<HTMLDivElement>(null);

  // Keep the bar being worked on in view as entry and the arrow keys move through the chart.
  useEffect(() => {
    if (!focus) return;
    root.current?.querySelector(`[data-hit="${focus}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focus]);

  const onDouble = (ev: MouseEvent<SVGRectElement>, s: SystemLayout, b: BarLayout) => {
    const svg = ev.currentTarget.ownerSVGElement!;
    const yPt = (ev.clientY - svg.getBoundingClientRect().top) / SCALE;
    props.onOpen(b.bar.id, zoneAt(s, yPt));
  };

  const at = entry ? locate(pages, entry.barId) : null;

  return (
    <div className="sheet" ref={root}>
      {pages.map((p) => (
        <div key={p.index} className="page" style={{ width: PAGE_W * SCALE, height: PAGE_H * SCALE }}>
          <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} width={PAGE_W * SCALE} height={PAGE_H * SCALE} className="page-svg" data-page={p.index + 1}>
            <rect width={PAGE_W} height={PAGE_H} fill="#fff" />
            <g className="edit-layer">
              {p.systems.flatMap((s) =>
                s.bars
                  .filter((b) => selected.has(b.bar.id))
                  .map((b) => (
                    <rect key={`sel${b.bar.id}`} className={b.bar.id === focus ? "sel focus" : "sel"} x={b.x} y={s.y - 4} width={b.w} height={STAFF_H + 8} rx={1.5} />
                  )),
              )}
            </g>
            <Notation page={p} title={song.title} source={song.source} />
            <g className="edit-layer">
              {p.index === 0 && (
                <>
                  <rect className="meta-hit" x={MARGIN_X + 80} y={TITLE_BASELINE - 22} width={PAGE_W - 2 * MARGIN_X - 160} height={28} onClick={() => props.onEditMeta("title")} />
                  <rect className="meta-hit" x={PAGE_W - MARGIN_X - 160} y={SOURCE_BASELINE - 12} width={160} height={16} onClick={() => props.onEditMeta("source")} />
                </>
              )}
              {p.systems.flatMap((s) =>
                s.bars.map((b) => {
                  const c = barColumn(s, b);
                  return (
                    <rect
                      key={b.bar.id}
                      data-hit={b.bar.id}
                      className="bar-hit"
                      x={c.x}
                      y={c.y}
                      width={c.w}
                      height={c.h}
                      onMouseDown={(e) => {
                        // Keeps focus where it is (an open chord box commits on its own blur only when
                        // the click lands elsewhere), and stops a drag from selecting page text.
                        e.preventDefault();
                        (document.activeElement as HTMLElement | null)?.blur();
                        props.onPress(b.bar.id, e.shiftKey);
                      }}
                      onDoubleClick={(e) => onDouble(e, s, b)}
                    />
                  );
                }),
              )}
            </g>
          </svg>
          {at && at.page === p.index && entry && (
            <ChordEntry
              key={entry.barId}
              song={song}
              initial={entry.seed ?? props.chordText(entry.barId)}
              selectAll={entry.seed === undefined}
              left={at.b.x * SCALE}
              top={(at.s.y - CHORD_ROW) * SCALE}
              width={Math.max(at.b.w * SCALE, 150)}
              onCommit={(v, move) => props.onCommitChords(entry.barId, v, move)}
              onCancel={props.onCancelEntry}
            />
          )}
          {p.index === 0 && props.editingMeta === "title" && (
            <MetaEdit
              initial={song.title}
              left={(MARGIN_X + 60) * SCALE}
              top={(TITLE_BASELINE - 24) * SCALE}
              width={(PAGE_W - 2 * MARGIN_X - 120) * SCALE}
              size={SIZE.title}
              align="center"
              onDone={(v) => (v === null ? props.onEditMeta(null) : props.onCommitMeta("title", v))}
            />
          )}
          {p.index === 0 && props.editingMeta === "source" && (
            <MetaEdit
              initial={song.source}
              left={(PAGE_W - MARGIN_X - 180) * SCALE}
              top={(SOURCE_BASELINE - 13) * SCALE}
              width={180 * SCALE}
              size={SIZE.source}
              align="right"
              onDone={(v) => (v === null ? props.onEditMeta(null) : props.onCommitMeta("source", v))}
            />
          )}
        </div>
      ))}
    </div>
  );
}

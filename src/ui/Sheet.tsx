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
import type { Key } from "../core/pitch";
import type { Song } from "../core/song";
import type { BarLayout, PageLayout, SystemLayout } from "./engrave/layout";
import {
  BELOW_BASELINE, BELOW_ROW, BOX_ROW, CHORD_ROW, MARGIN_X, PAGE_H, PAGE_W, SIZE, SOURCE_BASELINE,
  STAFF_H, TEXT_FONT, TITLE_BASELINE, VOLTA_ROW,
} from "./engrave/metrics";
import { Notation } from "./engrave/Notation";
import { beatTicks } from "../core/ticks";
import { suggest } from "./suggest";

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
  cellsOf: (barId: string) => { cells: string[]; cellTicks: number };
  /** Returns the cell in error to keep the boxes open, or null once stored. */
  onCommitCells: (barId: string, cells: string[], cellTicks: number, move: 1 | -1 | 0) => { cell: number; text: string } | null;
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

/**
 * Chord entry as beat cells (decision 6): *"chord adding logic is weird"*. A bar opens as one box
 * per beat, numbered, like iReal Pro's four spaces. Space steps to the next beat (Dorico), Enter or
 * Tab stores the bar and moves to the next one. An empty box means the chord before carries on. It
 * opens under the bar, so the bar being edited stays in view.
 */
function ChordCells(props: {
  song: Song;
  /** The key in force at the bar: suggestions are spelled in it. */
  chordKey: Key;
  initial: { cells: string[]; cellTicks: number };
  seed?: string;
  beatTicks: number;
  left: number;
  top: number;
  onCommit: (cells: string[], cellTicks: number, move: 1 | -1 | 0) => { cell: number; text: string } | null;
  onCancel: () => void;
}) {
  const [cells, setCells] = useState<string[]>(() =>
    props.seed !== undefined ? props.initial.cells.map((_, i) => (i === 0 ? props.seed! : "")) : props.initial.cells,
  );
  const [cellTicks, setCellTicks] = useState(props.initial.cellTicks);
  // ½ splits every beat in two, for a chord on the "and" (a push, decision 7). Back to whole beats
  // only while nothing sits on an "and".
  const halved = cellTicks < props.beatTicks;
  const canWhole = halved && cells.every((c, i) => i % 2 === 0 || c.trim() === "");
  const toggleHalf = () => {
    if (!halved) {
      setCells((c) => c.flatMap((x) => [x, ""]));
      setCellTicks(props.beatTicks / 2);
      setActive((a) => a * 2);
    } else if (canWhole) {
      setCells((c) => c.filter((_, i) => i % 2 === 0));
      setCellTicks(props.beatTicks);
      setActive((a) => Math.floor(a / 2));
    }
    refs.current[active]?.focus();
  };
  const [active, setActive] = useState(0);
  const [err, setErr] = useState<{ cell: number; text: string } | null>(null);
  const [hi, setHi] = useState(-1);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const box = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  // Caret after a typed first letter; select-all everywhere else. State, not a ref flipped inside
  // the effect: React runs effects twice in development, and the second run selected the seed letter
  // so "maj9" replaced the "e" (found driving it).
  const [caretEnd, setCaretEnd] = useState(props.seed !== undefined);
  const value = cells[active] ?? "";
  // A suggestion that only repeats what is typed is noise.
  const list = suggest(props.song, value.trim(), 6, props.chordKey).filter((t) => t !== value.trim());

  useLayoutEffect(() => {
    alive.current = true;
    // Under a bar near the window's bottom edge, focusing the box scrolled only the box itself into
    // view; the beat labels and suggestions under it stayed hidden (the sweep).
    box.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return () => {
      alive.current = false;
    };
  }, []);
  // The active box takes focus as it changes. Its text is selected when moved to, so typing
  // replaces it; with a typed first letter the caret goes after it instead.
  useLayoutEffect(() => {
    const el = refs.current[active];
    if (!el) return;
    el.focus();
    if (caretEnd) el.setSelectionRange(el.value.length, el.value.length);
    else el.select();
    setHi(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const go = (i: number) => {
    setCaretEnd(false);
    setActive(Math.max(0, Math.min(cells.length - 1, i)));
  };
  const set = (t: string) => {
    setCells((c) => c.map((x, i) => (i === active ? t : x)));
    setErr(null);
    setHi(-1);
  };
  const commit = (move: 1 | -1 | 0, now = cells) => {
    const e = props.onCommit(now, cellTicks, move);
    setErr(e);
    if (e) go(e.cell);
    return e;
  };
  const accepted = () => {
    if (hi < 0 || !list[hi]) return cells;
    const now = cells.map((x, i) => (i === active ? list[hi]! : x));
    setCells(now);
    setHi(-1);
    return now;
  };

  const onKey = (ev: KeyboardEvent<HTMLInputElement>, i: number) => {
    const el = ev.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;
    if (ev.key === " ") {
      ev.preventDefault();
      accepted();
      go(i + (ev.shiftKey ? -1 : 1));
    } else if (ev.key === "Backspace" && el.value === "" && i > 0) {
      ev.preventDefault();
      go(i - 1);
    } else if (ev.key === "ArrowRight" && atEnd && i < cells.length - 1) {
      ev.preventDefault();
      go(i + 1);
    } else if (ev.key === "ArrowLeft" && atStart && i > 0) {
      ev.preventDefault();
      go(i - 1);
    } else if (ev.key === "ArrowDown" && list.length) {
      ev.preventDefault();
      setHi((h) => Math.min(list.length - 1, h + 1));
    } else if (ev.key === "ArrowUp" && list.length) {
      ev.preventDefault();
      setHi((h) => Math.max(-1, h - 1));
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      if (hi >= 0) accepted();
      else commit(ev.shiftKey ? -1 : 1);
    } else if (ev.key === "Tab") {
      ev.preventDefault();
      commit(ev.shiftKey ? -1 : 1, accepted());
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      props.onCancel();
    }
  };

  const perBeat = props.beatTicks / cellTicks;
  const label = (i: number) => (i % perBeat === 0 ? String(i / perBeat + 1) : "&");
  return (
    <div
      ref={box}
      className="cells"
      style={{ left: props.left, top: props.top }}
      onBlur={(e) => {
        // Leaving the whole box stores the bar; moving between its own boxes does not.
        if (!alive.current || box.current?.contains(e.relatedTarget as Node | null)) return;
        if (commit(0) !== null) props.onCancel();
      }}
    >
      <div className="cells-row">
        <button
          className={halved ? "half on" : "half"}
          title={halved ? "Whole beats" : "Split beats for pushes"}
          disabled={halved && !canWhole}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleHalf}
        >
          ½
        </button>
        {cells.map((c, i) => (
          <label key={i} className={`cell${i === active ? " on" : ""}${err?.cell === i ? " invalid" : ""}${halved ? " narrow" : ""}`}>
            <span className="cell-beat">{label(i)}</span>
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={c}
              spellCheck={false}
              autoComplete="off"
              aria-label={`Beat ${label(i)}`}
              style={{ fontFamily: TEXT_FONT }}
              onFocus={() => i !== active && setActive(i)}
              onChange={(e) => set(e.target.value.replace(/\s+/g, ""))}
              onKeyDown={(e) => onKey(e, i)}
            />
          </label>
        ))}
      </div>
      {err ? (
        <div className="entry-error">{err.text}</div>
      ) : (
        list.length > 0 && (
          <ul className="suggest" style={{ marginLeft: 30 + active * (halved ? 50 : 70) }} onMouseDown={(e) => e.preventDefault()}>
            {list.map((t, i) => (
              // mousemove, not mouseenter: the list opens under a resting pointer, and mouseenter
              // then stole the highlight (decision 5's walk).
              <li key={t} className={i === hi ? "on" : ""} onMouseMove={() => hi !== i && setHi(i)} onClick={() => set(t)}>
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
                  {/* An empty title or source line is invisible, so on screen (never in print) it
                      shows its name, and a new chart's user can see there is something to click
                      (the sweep). */}
                  {!song.title && <text className="meta-ghost" x={PAGE_W / 2} y={TITLE_BASELINE} textAnchor="middle" fontSize={SIZE.title} fontFamily={TEXT_FONT}>Title</text>}
                  {!song.source && <text className="meta-ghost" x={PAGE_W - MARGIN_X} y={SOURCE_BASELINE} textAnchor="end" fontSize={SIZE.source} fontFamily={TEXT_FONT}>Source</text>}
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
            <ChordCells
              key={entry.barId}
              song={song}
              chordKey={at.b.ctx.key}
              initial={props.cellsOf(entry.barId)}
              {...(entry.seed !== undefined ? { seed: entry.seed } : {})}
              beatTicks={beatTicks(at.b.ctx.time)}
              left={Math.min(at.b.x * SCALE, PAGE_W * SCALE - 300)}
              top={(barColumn(at.s, at.b).y + barColumn(at.s, at.b).h) * SCALE + 2}
              onCommit={(c, t, move) => props.onCommitCells(entry.barId, c, t, move)}
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

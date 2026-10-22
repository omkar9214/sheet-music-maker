/**
 * The chart is the editor: the pages are drawn as they print, and every slot can be typed into where
 * it sits. Omkar, decision 2: *"there's already text boxes wherever the space is"*. Empty slots show
 * as dashed boxes on the bar under the pointer and across the selected system. They are never
 * printed.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Song } from "../core/song";
import { ChordPalette } from "./ChordPalette";
import type { BarLayout, PageLayout, SystemLayout } from "./engrave/layout";
import { BOX_H, CHORD_ROW, MARGIN_X, PAGE_H, PAGE_W, SIZE, SOURCE_BASELINE, STAFF_H, TEXT_FONT, TITLE_BASELINE } from "./engrave/metrics";
import { Notation, boxBottom, labelBaseline } from "./engrave/Notation";

/** Screen pixels per point. 1.45 makes the page 887 px wide: a letter page at a readable size on
 * a laptop. A narrower window scrolls rather than shrinking the page (non-negotiable 7). */
export const SCALE = 1.45;
/** Matches `.palette { width }` in styles.css. */
const PALETTE_W = 430;

export type Slot = "chord" | "above" | "below";
export type Editing =
  | { kind: Slot; barId: string }
  | { kind: "label"; sectionId: string }
  | { kind: "title" }
  | { kind: "source" };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function slotRect(s: SystemLayout, b: BarLayout, slot: Slot): Rect {
  if (slot === "chord") return { x: b.x, y: s.y - CHORD_ROW + 2, w: b.w, h: CHORD_ROW - 3 };
  if (slot === "above") {
    const bottom = boxBottom(s, 0);
    return { x: b.contentX, y: bottom - BOX_H, w: Math.max(b.x + b.w - b.contentX - 2, 40), h: BOX_H };
  }
  return { x: b.contentX, y: s.y + STAFF_H + 4, w: Math.max(b.x + b.w - b.contentX - 2, 40), h: 15 };
}

interface Props {
  song: Song;
  pages: PageLayout[];
  selected: string | null;
  editing: Editing | null;
  error: string | null;
  onSelect: (barId: string | null) => void;
  onEdit: (e: Editing | null) => void;
  /** Closes `e` only if it is still the open slot. */
  onClose: (e: Editing) => void;
  /** Returns an error to keep the box open, or null when it was stored. */
  onCommit: (e: Editing, value: string, move: 1 | -1 | 0) => string | null;
  initialValue: (e: Editing) => string;
}

function find(pages: PageLayout[], barId: string): { s: SystemLayout; b: BarLayout; page: number } | null {
  for (const p of pages)
    for (const s of p.systems) {
      const b = s.bars.find((x) => x.bar.id === barId);
      if (b) return { s, b, page: p.index };
    }
  return null;
}

function editRect(pages: PageLayout[], e: Editing): { page: number; r: Rect; size: number } | null {
  if (e.kind === "title") return { page: 0, r: { x: MARGIN_X + 80, y: TITLE_BASELINE - 22, w: PAGE_W - 2 * MARGIN_X - 160, h: 28 }, size: SIZE.title };
  if (e.kind === "source") return { page: 0, r: { x: PAGE_W - MARGIN_X - 160, y: SOURCE_BASELINE - 12, w: 160, h: 16 }, size: SIZE.source };
  if (e.kind === "label") {
    for (const p of pages)
      for (const s of p.systems)
        if (s.sectionId === e.sectionId && s.label)
          return { page: p.index, r: { x: MARGIN_X - 2, y: labelBaseline(s) - 14, w: 150, h: 19 }, size: SIZE.label };
    return null;
  }
  const hit = find(pages, e.barId);
  if (!hit) return null;
  const r = slotRect(hit.s, hit.b, e.kind);
  const size = e.kind === "chord" ? SIZE.chord : SIZE.cue;
  // A cue is usually longer than its bar, and a chord box holds a whole bar's chords. Both get room
  // to type in; the page itself is unchanged.
  const minW = e.kind === "chord" ? 110 : 230;
  return { page: hit.page, r: { ...r, w: Math.max(r.w, minW) }, size };
}

function EditLayer({ page, selected, editing, onSelect, onEdit }: {
  page: PageLayout;
  selected: string | null;
  editing: Editing | null;
  onSelect: (id: string) => void;
  onEdit: (e: Editing) => void;
}) {
  return (
    <g className="edit-layer">
      {page.systems.map((s) => {
        const systemSelected = s.bars.some((b) => b.bar.id === selected);
        return (
          <g key={s.bars[0]!.bar.id} className={systemSelected ? "sys selected" : "sys"}>
            {s.label && (
              <rect
                className="hit"
                x={MARGIN_X - 2}
                y={labelBaseline(s) - 13}
                width={110}
                height={17}
                onClick={() => onEdit({ kind: "label", sectionId: s.sectionId })}
              />
            )}
            {s.bars.map((b) => {
              const isSel = b.bar.id === selected;
              const slots: Array<[Slot, boolean]> = [["above", !!b.bar.cueAbove], ["chord", b.bar.chords.length > 0], ["below", !!b.bar.cueBelow]];
              return (
                <g key={b.bar.id} className={isSel ? "bar-edit selected" : "bar-edit"}>
                  {isSel && <rect className="sel" x={b.x} y={s.y - 3} width={b.w} height={STAFF_H + 6} />}
                  <rect
                    className="hit"
                    x={b.x}
                    y={s.y - 2}
                    width={b.w}
                    height={STAFF_H + 4}
                    onClick={() => {
                      onSelect(b.bar.id);
                      onEdit({ kind: "chord", barId: b.bar.id });
                    }}
                  />
                  {slots.map(([slot, filled]) => {
                    const r = slotRect(s, b, slot);
                    const active = editing && "barId" in editing && editing.barId === b.bar.id && editing.kind === slot;
                    return (
                      <rect
                        key={slot}
                        className={`slot ${filled ? "filled" : "empty"}${active ? " active" : ""}`}
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        onClick={() => {
                          onSelect(b.bar.id);
                          onEdit({ kind: slot, barId: b.bar.id });
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function Overlay(props: Props & { page: number }) {
  const { editing } = props;
  if (!editing) return null;
  const at = editRect(props.pages, editing);
  if (!at || at.page !== props.page) return null;
  // One input per slot, keyed by it: it mounts holding its slot's text and takes focus in the same
  // commit. The first version filled the box in one effect and focused it in a later one; keys
  // typed in between went nowhere, and a cue typed into a fresh system was lost (WORKLOG).
  return <SlotInput key={JSON.stringify(editing)} {...props} editing={editing} at={at} />;
}

function SlotInput(props: Props & { editing: Editing; at: { r: Rect; size: number } }) {
  const { editing, at } = props;
  const [value, setValue] = useState(() => props.initialValue(editing));
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // False from the moment this slot is torn down, so the blur a browser may fire on removal does not
  // commit or close the slot that replaced it.
  const alive = useRef(true);

  useLayoutEffect(() => {
    alive.current = true;
    input.current?.focus();
    // Selected, so typing replaces a bar's chords rather than appending to them ("Bmaj7e9 g#m7").
    input.current?.select();
    return () => {
      alive.current = false;
    };
  }, []);

  const commit = (move: 1 | -1 | 0) => {
    const e = props.onCommit(editing, value, move);
    setErr(e);
    return e;
  };
  const onKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter" || (ev.key === "Tab" && editing.kind !== "title" && editing.kind !== "source" && editing.kind !== "label")) {
      ev.preventDefault();
      commit(ev.shiftKey ? -1 : 1);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      props.onClose(editing);
    }
  };
  const style: CSSProperties = {
    left: at.r.x * SCALE,
    top: at.r.y * SCALE,
    width: at.r.w * SCALE,
    height: at.r.h * SCALE,
    fontFamily: TEXT_FONT,
    fontSize: at.size * SCALE,
  };
  return (
    <>
      <input
        ref={input}
        className={`slot-input slot-${editing.kind}${err ? " invalid" : ""}`}
        style={style}
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          setErr(null);
        }}
        onKeyDown={onKey}
        // Leaving the box keeps what was typed (non-negotiable 4). A refused chord stays as it was.
        onBlur={() => {
          if (!alive.current) return;
          if (commit(0) === null) props.onClose(editing);
        }}
        aria-label={editing.kind}
        title={err ?? undefined}
      />
      {err && (
        <div className="slot-error" style={{ left: at.r.x * SCALE, top: (at.r.y + at.r.h) * SCALE + 2 }}>
          {err}
        </div>
      )}
      {editing.kind === "chord" && (
        // Kept inside the page: at the last bar of a system it hung 96 px past the scroller's edge.
        <div className="palette-wrap" style={{ left: Math.min(at.r.x * SCALE, PAGE_W * SCALE - PALETTE_W - 8), top: (at.r.y + at.r.h) * SCALE + (err ? 24 : 4) }}>
          <ChordPalette
            song={props.song}
            onPick={(f) => {
              setValue((v) => f(v));
              setErr(null);
              input.current?.focus();
            }}
          />
        </div>
      )}
    </>
  );
}

export function Sheet(props: Props) {
  const { pages, song } = props;
  return (
    <div className="sheet">
      {pages.map((p) => (
        <div key={p.index} className="page" style={{ width: PAGE_W * SCALE, height: PAGE_H * SCALE }}>
          <svg
            viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
            width={PAGE_W * SCALE}
            height={PAGE_H * SCALE}
            className="page-svg"
            data-page={p.index + 1}
          >
            <rect width={PAGE_W} height={PAGE_H} fill="#fff" />
            <Notation page={p} title={song.title} source={song.source} />
            {p.index === 0 && (
              <g className="edit-layer">
                <rect className="slot empty-hover" x={MARGIN_X + 80} y={TITLE_BASELINE - 22} width={PAGE_W - 2 * MARGIN_X - 160} height={28} onClick={() => props.onEdit({ kind: "title" })} />
                <rect className="slot empty-hover" x={PAGE_W - MARGIN_X - 160} y={SOURCE_BASELINE - 12} width={160} height={16} onClick={() => props.onEdit({ kind: "source" })} />
              </g>
            )}
            <EditLayer page={p} selected={props.selected} editing={props.editing} onSelect={props.onSelect} onEdit={props.onEdit} />
          </svg>
          <Overlay {...props} page={p.index} />
        </div>
      ))}
    </div>
  );
}

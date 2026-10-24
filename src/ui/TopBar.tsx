/**
 * Song-wide settings, and the chart list. The key menu has two actions, because "set the key" means
 * two different things: **Transpose** moves every chord (decision 2), and **Set key** keeps them, for
 * a key that was set wrong before the chords went in.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KEYS, keyName, sameKey, type Key } from "../core/pitch";
import { STEP_TICKS, beatEvents, eventsText, gridFromEvents, parsePattern, stepCounts, textFromGrid, type Pattern } from "../core/rhythm";
import { beatTicks } from "../core/ticks";
import { RhythmGrid } from "./RhythmGrid";
import type { Clef, Song } from "../core/song";
import { TIME_SIGS, type TimeSig } from "../core/ticks";
import type { ChartStore } from "./store";
import type { ChordView } from "../core/chord";
import { PARTS, type Part } from "../core/part";
import { exportChart, exportChordPro, exportMusicXML } from "./sharing";

export function Popover({ label, children, className }: { label: ReactNode; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    // Escape closes the menu and stops there: captured first, so the editor's own Escape (deselect)
    // never sees it, whatever order the listeners were added in.
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    // pointerdown, not mousedown: a tap fires mousedown only after it ends, and on some Android
    // browsers not at all when the tap scrolls (decision 18).
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc, { capture: true });
    };
  }, [open]);
  return (
    <div className={`pop ${className ?? ""}`} ref={ref}>
      <button className={open ? "tb on" : "tb"} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && <div className="pop-panel">{children(() => setOpen(false))}</div>}
    </div>
  );
}

const CLEFS: Array<[Clef, string]> = [["treble8vb", "Treble 8vb"], ["treble", "Treble"], ["bass", "Bass"]];

/** Keys in circle order, major then minor; `only` narrows to one mode (§7.2: Transpose keeps the
 * mode, so the other mode's keys are not drawn). */
export function KeyGrid({ current, only, onPick }: { current: Key | null; only?: Key["mode"]; onPick: (k: Key) => void }) {
  return (
    <>
      {(["major", "minor"] as const)
        .filter((m) => !only || m === only)
        .map((mode) => (
          <div key={mode} className="key-grid">
            {KEYS.filter((k) => k.mode === mode).map((k) => (
              <button key={keyName(k)} className={current && sameKey(k, current) ? "chip on" : "chip"} onClick={() => onPick(k)}>
                {keyName(k)}
              </button>
            ))}
          </div>
        ))}
    </>
  );
}

const VIEWS: Array<[ChordView, string, string]> = [
  ["letters", "A", "Letters"],
  ["numbers", "1", "Nashville numbers"],
  ["roman", "I", "Roman numerals"],
];

export function TopBar(props: {
  store: ChartStore;
  /** The Form drawer's button, on a phone or tablet (decision 18). */
  lead?: ReactNode;
  view: ChordView;
  onView: (v: ChordView) => void;
  part: Part;
  /** The key the page shows: the part's, when a part is chosen. */
  shownKey: Key;
  onPart: (p: Part) => void;
  onFiles: (files: FileList) => void;
  onShare: () => void;
  onTranspose: (k: Key) => void;
  onSetKey: (k: Key) => void;
  onTempo: (n: number) => void;
  onTime: (t: TimeSig) => void;
  onClef: (c: Clef) => void;
  onPatterns: (p: Pattern[]) => void;
}) {
  const { store } = props;
  const song = store.song;
  const fileInput = useRef<HTMLInputElement>(null);
  const [keyMode, setKeyMode] = useState<"transpose" | "set">("transpose");
  const [tempo, setTempo] = useState(String(song.tempo));
  useEffect(() => setTempo(String(song.tempo)), [song.tempo]);

  return (
    <header className="topbar">
      {props.lead}
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept=".json,.cho,.chopro,.chordpro,.crd,.pro,.txt"
        onChange={(e) => {
          if (e.target.files?.length) props.onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {/* On a phone these scroll sideways under a finger; undo, redo and Print stay put (decision 18). */}
      <div className="tb-scroll">
      <Popover label={<span className="chart-name">{song.title || "Untitled"} ▾</span>} className="charts">
        {(close) => (
          <div className="charts-panel">
            <div className="chips">
              <button className="chip" onClick={() => { store.create(); close(); }}>New</button>
              <button className="chip" onClick={() => { store.duplicate(); close(); }}>Duplicate</button>
              <button className="chip" onClick={() => { fileInput.current?.click(); close(); }}>Import…</button>
            </div>
            <div className="chips">
              <span className="muted share-label">Send</span>
              <button className="chip" onClick={() => { props.onShare(); close(); }}>Copy link</button>
              <button className="chip" onClick={() => { exportChart(song); close(); }}>Chart file</button>
              <button className="chip" onClick={() => { exportChordPro(song); close(); }}>ChordPro</button>
              <button className="chip" onClick={() => { exportMusicXML(song); close(); }}>MusicXML</button>
            </div>
            <ul className="chart-list">
              {store.lib.order.map((id) => {
                const s = store.lib.charts[id]!;
                return (
                  <li key={id} className={id === store.lib.current ? "on" : ""}>
                    <button className="link" onClick={() => { store.open(id); close(); }}>{s.title || "Untitled"}</button>
                    <span className="muted">{keyName(s.key)}</span>
                    {store.lib.order.length > 1 && (
                      <button
                        className="x"
                        title="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete “${s.title}”?`)) store.remove(id);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Popover>

      <Popover label={<>Key <b>{keyName(song.key)}</b>{!sameKey(props.shownKey, song.key) && <span className="muted"> · {keyName(props.shownKey)}</span>}</>}>
        {(close) => (
          <div className="key-panel">
            <div className="seg">
              <button className={keyMode === "transpose" ? "on" : ""} onClick={() => setKeyMode("transpose")}>Transpose</button>
              <button className={keyMode === "set" ? "on" : ""} onClick={() => setKeyMode("set")}>Set key</button>
            </div>
            <KeyGrid
              current={song.key}
              {...(keyMode === "transpose" ? { only: song.key.mode } : {})}
              onPick={(k) => {
                if (keyMode === "transpose") props.onTranspose(k);
                else props.onSetKey(k);
                close();
              }}
            />
          </div>
        )}
      </Popover>

      <label className="tb tempo">
        ♩ =
        <input
          value={tempo}
          inputMode="numeric"
          onChange={(e) => setTempo(e.target.value.replace(/\D/g, "").slice(0, 3))}
          onBlur={() => {
            const n = Number(tempo);
            if (n >= 20 && n <= 400) props.onTempo(n);
            else setTempo(String(song.tempo));
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </label>

      <Popover label={`${song.time.beats}/${song.time.unit}`}>
        {(close) => (
          <div className="chips">
            {TIME_SIGS.map((t) => (
              <button
                key={`${t.beats}/${t.unit}`}
                className={t.beats === song.time.beats && t.unit === song.time.unit ? "chip on" : "chip"}
                onClick={() => { props.onTime(t); close(); }}
              >
                {t.beats}/{t.unit}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <Popover label={CLEFS.find(([c]) => c === song.clef)![1]}>
        {(close) => (
          <div className="chips">
            {CLEFS.map(([c, t]) => (
              <button key={c} className={c === song.clef ? "chip on" : "chip"} onClick={() => { props.onClef(c); close(); }}>{t}</button>
            ))}
          </div>
        )}
      </Popover>

      <div className="seg view-seg" role="group" aria-label="Chord display">
        {VIEWS.map(([v, l, t]) => (
          <button key={v} className={props.view === v ? "on" : ""} title={t} onClick={() => props.onView(v)}>{l}</button>
        ))}
      </div>

      <Popover label={<>Part <b>{PARTS.find((x) => x.id === props.part)!.label}</b></>}>
        {(close) => (
          <div className="chips part-chips">
            {PARTS.map((x) => (
              <button key={x.id} className={x.id === props.part ? "chip on" : "chip"} onClick={() => { props.onPart(x.id); close(); }}>{x.label}</button>
            ))}
          </div>
        )}
      </Popover>

      <Popover label="Patterns">
        {() => <PatternsPanel song={song} onChange={props.onPatterns} />}
      </Popover>

      </div>
      {!store.saved && <span className="warn">Not saved</span>}
      <button className="tb" onClick={store.undo} disabled={!store.canUndo} title="Undo (⌘Z)">↶</button>
      <button className="tb" onClick={store.redo} disabled={!store.canRedo} title="Redo (⇧⌘Z)">↷</button>
      <button className="tb primary" onClick={() => window.print()}>Print</button>
    </header>
  );
}

/** The song's own patterns. Each is checked against the meter as it is typed (non-negotiable 1). */
/**
 * The song's own patterns, each as the same step grid as the inspector's (decision 6). Editing one
 * here changes every bar that uses it. A pattern that doesn't fit the meter says so, and its grid
 * starts from beat slashes (non-negotiable 1: never drawn overfull).
 */
function PatternsPanel({ song, onChange }: { song: Song; onChange: (p: Pattern[]) => void }) {
  const own = song.patterns.filter((p) => p.text !== "");
  const update = (id: string, patch: Partial<Pattern>) =>
    onChange(own.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const counts = stepCounts(song.time);
  const beatSteps = beatTicks(song.time) / STEP_TICKS;
  return (
    <div className="patterns-panel">
      {own.map((p) => {
        const parsed = parsePattern(p.text, song.time);
        const steps = (parsed.ok ? gridFromEvents(parsed.events, song.time) : null) ?? gridFromEvents(beatEvents(song.time), song.time)!;
        return (
          <div key={p.id} className="pattern-row">
            <div className="pattern-head">
              <input
                className="pname"
                defaultValue={p.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && update(p.id, { name: e.target.value.trim() })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
              {!parsed.ok && <span className="perr">doesn't fit {song.time.beats}/{song.time.unit}</span>}
              <button className="x" title="Delete" onClick={() => onChange(own.filter((x) => x.id !== p.id))}>×</button>
            </div>
            <RhythmGrid steps={steps} counts={counts} beatSteps={beatSteps} onChange={(st) => update(p.id, { text: textFromGrid(st, song.time) })} />
          </div>
        );
      })}
      <button
        className="chip"
        onClick={() => {
          const id = `p${Date.now().toString(36)}`;
          onChange([...own, { id, name: `Pattern ${own.length + 1}`, text: eventsText(beatEvents(song.time)) }]);
        }}
      >
        + Pattern
      </button>
    </div>
  );
}

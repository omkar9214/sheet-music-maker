/**
 * Song-wide settings, and the chart list. The key menu has two actions, because "set the key" means
 * two different things: **Transpose** moves every chord (decision 2), and **Set key** keeps them, for
 * a key that was set wrong before the chords went in.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KEYS, keyName, sameKey, type Key } from "../core/pitch";
import { parsePattern, type Pattern } from "../core/rhythm";
import type { Clef, Song } from "../core/song";
import { TIME_SIGS, type TimeSig } from "../core/ticks";
import type { ChartStore } from "./store";

function Popover({ label, children, className }: { label: ReactNode; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [open]);
  return (
    <div className={`pop ${className ?? ""}`} ref={ref}>
      <button className={open ? "tb on" : "tb"} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && <div className="pop-panel">{children(() => setOpen(false))}</div>}
    </div>
  );
}

const CLEFS: Array<[Clef, string]> = [["treble8vb", "Treble 8vb"], ["treble", "Treble"], ["bass", "Bass"]];

export function TopBar(props: {
  store: ChartStore;
  onTranspose: (k: Key) => void;
  onSetKey: (k: Key) => void;
  onTempo: (n: number) => void;
  onTime: (t: TimeSig) => void;
  onClef: (c: Clef) => void;
  onPatterns: (p: Pattern[]) => void;
}) {
  const { store } = props;
  const song = store.song;
  const [keyMode, setKeyMode] = useState<"transpose" | "set">("transpose");
  const [tempo, setTempo] = useState(String(song.tempo));
  useEffect(() => setTempo(String(song.tempo)), [song.tempo]);

  return (
    <header className="topbar">
      <Popover label={<span className="chart-name">{song.title || "Untitled"} ▾</span>} className="charts">
        {(close) => (
          <div className="charts-panel">
            <div className="chips">
              <button className="chip" onClick={() => { store.create(); close(); }}>New</button>
              <button className="chip" onClick={() => { store.duplicate(); close(); }}>Duplicate</button>
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

      <Popover label={<>Key <b>{keyName(song.key)}</b></>}>
        {(close) => (
          <div className="key-panel">
            <div className="seg">
              <button className={keyMode === "transpose" ? "on" : ""} onClick={() => setKeyMode("transpose")}>Transpose</button>
              <button className={keyMode === "set" ? "on" : ""} onClick={() => setKeyMode("set")}>Set key</button>
            </div>
            {(["major", "minor"] as const).map((mode) => (
              <div key={mode} className="key-grid">
                {KEYS.filter((k) => k.mode === mode).map((k) => (
                  <button
                    key={keyName(k)}
                    className={sameKey(k, song.key) ? "chip on" : "chip"}
                    onClick={() => {
                      if (keyMode === "transpose") props.onTranspose(k);
                      else props.onSetKey(k);
                      close();
                    }}
                  >
                    {keyName(k)}
                  </button>
                ))}
              </div>
            ))}
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

      <Popover label="Patterns">
        {() => <PatternsPanel song={song} onChange={props.onPatterns} />}
      </Popover>

      <span className="spacer" />
      {!store.saved && <span className="warn">Not saved</span>}
      <button className="tb" onClick={store.undo} disabled={!store.canUndo} title="Undo (⌘Z)">↶</button>
      <button className="tb" onClick={store.redo} disabled={!store.canRedo} title="Redo (⇧⌘Z)">↷</button>
      <button className="tb primary" onClick={() => window.print()}>Print</button>
    </header>
  );
}

/** The song's own patterns. Each is checked against the meter as it is typed (non-negotiable 1). */
function PatternsPanel({ song, onChange }: { song: Song; onChange: (p: Pattern[]) => void }) {
  const own = song.patterns.filter((p) => p.text !== "");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const update = (id: string, patch: Partial<Pattern>) =>
    onChange(own.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <div className="patterns-panel">
      {song.patterns.filter((p) => p.text === "").map((p) => (
        <div key={p.id} className="pattern-row builtin">
          <span className="pname">{p.name}</span>
        </div>
      ))}
      {own.map((p) => {
        const draft = drafts[p.id] ?? p.text;
        const check = parsePattern(draft, song.time);
        return (
          <div key={p.id} className="pattern-row">
            <input className="pname" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
            <input
              className={check.ok ? "ptext" : "ptext invalid"}
              value={draft}
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value;
                setDrafts((d) => ({ ...d, [p.id]: v }));
                if (parsePattern(v, song.time).ok) update(p.id, { text: v });
              }}
            />
            <span className="perr">{check.ok ? "" : check.error}</span>
            <button className="x" title="Delete" onClick={() => onChange(own.filter((x) => x.id !== p.id))}>×</button>
          </div>
        );
      })}
      <button
        className="chip"
        onClick={() => {
          const id = `p${Date.now().toString(36)}`;
          onChange([...own, { id, name: `Pattern ${own.length + 1}`, text: Array(song.time.beats).fill(String(song.time.unit)).join(" ") }]);
        }}
      >
        + Pattern
      </button>
    </div>
  );
}

/**
 * The chart maker (AGENTS.md §0, decisions 2–3): the page is the editor, the inspector holds what
 * belongs to the selected bar and its section, and the top bar holds the song.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { barText } from "./core/chord";
import {
  addSection, allBars, deleteBar, deletePattern, deleteSection, duplicateSection, findBar, insertBar,
  moveSection, setBarText, setKeyKeepChords, setPatterns, setTime, transpose, updateBar, updateSection,
  type Bar, type Song,
} from "./core/song";
import { Inspector, type InspectorActions } from "./ui/Inspector";
import { Sheet, type Editing } from "./ui/Sheet";
import { TopBar } from "./ui/TopBar";
import { layoutSong } from "./ui/engrave/layout";
import { measureText, useFontsReady } from "./ui/engrave/measure";
import { useChartStore } from "./ui/store";

function barOf(song: Song, id: string | null): Bar | undefined {
  const r = id ? findBar(song, id) : null;
  return r ? song.sections[r.section]?.bars[r.bar] : undefined;
}

export function App() {
  const store = useChartStore();
  const { song, edit } = store;
  const fonts = useFontsReady();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const pages = useMemo(() => (fonts ? layoutSong(song, measureText) : []), [song, fonts]);

  // A selection that no longer exists (undo, delete, another chart) is dropped, not kept dangling.
  useEffect(() => {
    if (selected && !findBar(song, selected)) setSelected(null);
    if (editing && "barId" in editing && !findBar(song, editing.barId)) setEditing(null);
  }, [song, selected, editing]);
  useEffect(() => {
    document.title = song.title ? `${song.title} — Sheet Music Maker` : "Sheet Music Maker";
  }, [song.title]);

  const initialValue = useCallback(
    (e: Editing): string => {
      if (e.kind === "title") return song.title;
      if (e.kind === "source") return song.source;
      if (e.kind === "label") return song.sections.find((s) => s.id === e.sectionId)?.name ?? "";
      const bar = barOf(song, e.barId);
      if (!bar) return "";
      if (e.kind === "chord") return barText(bar.chords, song.key, song.time);
      return (e.kind === "above" ? bar.cueAbove : bar.cueBelow) ?? "";
    },
    [song],
  );

  const onCommit = useCallback(
    (e: Editing, value: string, move: 1 | -1 | 0): string | null => {
      const unchanged = value === initialValue(e);
      if (e.kind === "title") {
        if (!unchanged) edit((s) => ({ ...s, title: value.trim() }));
        setEditing(null);
        return null;
      }
      if (e.kind === "source") {
        if (!unchanged) edit((s) => ({ ...s, source: value.trim() }));
        setEditing(null);
        return null;
      }
      if (e.kind === "label") {
        const name = value.trim().replace(/:$/, "");
        if (!unchanged && name) edit((s) => updateSection(s, e.sectionId, { name }));
        setEditing(null);
        return null;
      }
      if (!unchanged) {
        if (e.kind === "chord") {
          const r = setBarText(song, e.barId, value);
          if (r.error) return r.error;
          edit(() => r.song);
        } else {
          const text = value.trim();
          edit((s) => updateBar(s, e.barId, e.kind === "above" ? { cueAbove: text } : { cueBelow: text }));
        }
      }
      if (move === 0) return null;
      // Enter / Tab: on to the same slot in the next bar, which is the transcribing loop (§0 step 3).
      const flat = allBars(song);
      const i = flat.findIndex((x) => x.bar.id === e.barId);
      const next = flat[i + move];
      if (next) {
        setSelected(next.bar.id);
        setEditing({ kind: e.kind, barId: next.bar.id });
      } else {
        setEditing(null);
      }
      return null;
    },
    [song, edit, initialValue],
  );

  // Undo and redo from the keyboard, except inside a text box, which has its own.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) store.redo();
        else store.undo();
      } else if (mod && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        store.redo();
      } else if (!mod && selected) {
        const flat = allBars(song);
        const i = flat.findIndex((x) => x.bar.id === selected);
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
          const n = flat[i + (ev.key === "ArrowRight" ? 1 : -1)];
          if (n) setSelected(n.bar.id);
          ev.preventDefault();
        } else if (ev.key === "Enter") {
          setEditing({ kind: "chord", barId: selected });
          ev.preventDefault();
        } else if (ev.key === "Escape") {
          setSelected(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, selected, song]);

  const sel = selected;
  const ref = sel ? findBar(song, sel) : null;
  const sectionId = ref ? song.sections[ref.section]!.id : null;
  const onBar = (patch: Partial<Omit<Bar, "id">>) => sel && edit((s) => updateBar(s, sel, patch));
  const bar = barOf(song, sel);

  const actions: InspectorActions = {
    setBarPattern: (id) => onBar({ pattern: id }),
    setSectionPattern: (id) => sectionId && edit((s) => updateSection(s, sectionId, { pattern: id })),
    toggleRepeatStart: () => onBar({ repeatStart: bar?.repeatStart ? undefined : true }),
    toggleRepeatEnd: () => onBar({ repeatEnd: bar?.repeatEnd ? undefined : { times: 2 } }),
    setRepeatTimes: (n) => onBar({ repeatEnd: { times: Math.min(16, Math.max(2, n)) } }),
    toggleEnding: (n) => {
      const cur = bar?.ending ?? [];
      const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b);
      onBar({ ending: next });
    },
    setMarker: (m) => onBar({ marker: m }),
    setJump: (j) => onBar({ jump: j }),
    insertBar: (before) => {
      if (!sel) return;
      const r = insertBar(song, sel, before);
      edit(() => r.song);
      setSelected(r.id);
    },
    deleteBar: () => {
      if (!sel) return;
      const flat = allBars(song);
      const i = flat.findIndex((x) => x.bar.id === sel);
      const next = flat[i + 1]?.ref.section === ref?.section ? flat[i + 1] : flat[i - 1];
      edit((s) => deleteBar(s, sel));
      setSelected(next?.bar.id ?? null);
    },
    renameSection: () => sectionId && setEditing({ kind: "label", sectionId }),
    moveSection: (by) => sectionId && edit((s) => moveSection(s, sectionId, by)),
    duplicateSection: () => {
      if (!sectionId) return;
      const r = duplicateSection(song, sectionId);
      if (!r) return;
      edit(() => r.song);
      setSelected(r.section.bars[0]!.id);
    },
    deleteSection: () => {
      if (!sectionId) return;
      edit((s) => deleteSection(s, sectionId));
      setSelected(null);
    },
    addSection: (name) => {
      const after = ref ? ref.section : song.sections.length - 1;
      const r = addSection(song, after, name);
      edit(() => r.song);
      setSelected(r.section.bars[0]!.id);
      setEditing({ kind: "chord", barId: r.section.bars[0]!.id });
    },
  };

  return (
    <div className="app">
      <TopBar
        store={store}
        onTranspose={(k) => edit((s) => transpose(s, k))}
        onSetKey={(k) => edit((s) => setKeyKeepChords(s, k))}
        onTempo={(n) => edit((s) => (s.tempo === n ? s : { ...s, tempo: n }))}
        onTime={(t) => edit((s) => setTime(s, t))}
        onClef={(c) => edit((s) => ({ ...s, clef: c }))}
        onPatterns={(ps) =>
          edit((s) => {
            const removed = s.patterns.filter((p) => p.text !== "" && !ps.some((q) => q.id === p.id));
            return removed.reduce((acc, p) => deletePattern(acc, p.id), setPatterns(s, ps));
          })
        }
      />
      <div className="workspace">
        <main
          className="scroller"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setEditing(null);
            }
          }}
        >
          {fonts && (
            <Sheet
              song={song}
              pages={pages}
              selected={selected}
              editing={editing}
              error={null}
              onSelect={setSelected}
              onEdit={setEditing}
              onClose={(e) => setEditing((cur) => (cur && JSON.stringify(cur) === JSON.stringify(e) ? null : cur))}
              onCommit={onCommit}
              initialValue={initialValue}
            />
          )}
        </main>
        <Inspector song={song} barId={selected} a={actions} />
      </div>
    </div>
  );
}

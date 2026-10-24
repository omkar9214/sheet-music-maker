/**
 * The chart maker (AGENTS.md §0, decisions 2–3), editor redesigned in decision 5: the Form panel
 * holds the sections, the page is selected bar by bar like a spreadsheet, and the inspector acts on
 * the selection. The keyboard does the transcribing:
 *
 *   ←/→ ↑/↓   move (⇧ extends)        A–G, %, N   start typing chords into the bar
 *   Enter     edit the bar's chords   Enter/Tab   in the box: store, next bar (⇧: previous)
 *   ⌫         clear chords            ⌘C / ⌘V     copy / paste bars
 *   Esc       deselect                ⌘Z / ⇧⌘Z    undo / redo
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { barText, chordCells } from "./core/chord";
import { barRhythm, gridOfRhythm, textFromGrid } from "./core/rhythm";
import {
  addSection, allBars, barPatternId, barRange, clearChords, copyBars, deleteBars, deletePattern,
  deleteSection, duplicateSection, findBar, insertBar, moveSection, pasteBars, patternById,
  saveRhythmAsPattern, setBarCells, setBarCount, setBarsPattern, setBarsRhythm, setKeyKeepChords,
  setPatterns, setRepeat, setTime, toggleEnding, transpose, updateBar,
  updateSection, type Bar, type BarClip, type Song,
} from "./core/song";
import { FormPanel, type FormActions } from "./ui/FormPanel";
import { Inspector, type InspectorActions } from "./ui/Inspector";
import { Sheet, type Entry, type Zone } from "./ui/Sheet";
import { TopBar } from "./ui/TopBar";
import { layoutSong, type PageLayout } from "./ui/engrave/layout";
import { measureText, useFontsReady } from "./ui/engrave/measure";
import { useChartStore } from "./ui/store";

interface Selection {
  anchor: string;
  focus: string;
}

function barOf(song: Song, id: string | null): Bar | undefined {
  const r = id ? findBar(song, id) : null;
  return r ? song.sections[r.section]?.bars[r.bar] : undefined;
}

/** ↑/↓: the bar in the system above or below whose middle is nearest this one's. */
function verticalNeighbour(pages: PageLayout[], id: string, dir: -1 | 1): string | null {
  const systems = pages.flatMap((p) => p.systems);
  const i = systems.findIndex((s) => s.bars.some((b) => b.bar.id === id));
  const here = systems[i]?.bars.find((b) => b.bar.id === id);
  const there = systems[i + dir];
  if (!here || !there) return null;
  const mid = here.x + here.w / 2;
  let best = there.bars[0]!;
  for (const b of there.bars) if (Math.abs(b.x + b.w / 2 - mid) < Math.abs(best.x + best.w / 2 - mid)) best = b;
  return best.bar.id;
}

export function App() {
  const store = useChartStore();
  const { song, edit } = store;
  const fonts = useFontsReady();
  const [sel, setSel] = useState<Selection | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [meta, setMeta] = useState<"title" | "source" | null>(null);
  const [focusCue, setFocusCue] = useState<{ which: "above" | "below"; n: number } | null>(null);
  const clipboard = useRef<BarClip[]>([]);

  const pages = useMemo(() => (fonts ? layoutSong(song, measureText) : []), [song, fonts]);
  const ids = useMemo(() => (sel ? barRange(song, sel.anchor, sel.focus) : []), [song, sel]);
  const selected = useMemo(() => new Set(ids), [ids]);

  // A selection that no longer exists (undo, delete, another chart) is dropped, not kept dangling.
  useEffect(() => {
    if (sel && (!findBar(song, sel.anchor) || !findBar(song, sel.focus))) setSel(null);
    if (entry && !findBar(song, entry.barId)) setEntry(null);
  }, [song, sel, entry]);
  useEffect(() => {
    document.title = song.title ? `${song.title} — Sheet Music Maker` : "Sheet Music Maker";
  }, [song.title]);

  const select = (id: string) => setSel({ anchor: id, focus: id });

  const chordText = useCallback(
    (id: string) => {
      const b = barOf(song, id);
      return b ? barText(b.chords, song.key, song.time) : "";
    },
    [song],
  );

  const cellsOf = useCallback(
    (id: string) => chordCells(barOf(song, id)?.chords ?? [], song.key, song.time),
    [song],
  );

  const onCommitCells = useCallback(
    (id: string, cells: string[], cellTicks: number, move: 1 | -1 | 0) => {
      const before = cellsOf(id);
      const changed = cellTicks !== before.cellTicks || cells.some((c, i) => c.trim() !== before.cells[i]);
      if (changed) {
        const r = setBarCells(song, id, cells, cellTicks, song.key);
        if (r.error) return r.error;
        edit(() => r.song);
      }
      if (move === 0) {
        setEntry(null);
        return null;
      }
      // Enter / Tab: on to the next bar with the boxes still open, which is the transcribing loop
      // (§0 step 3). Off the end of the chart, entry closes and the last bar stays selected.
      const flat = allBars(song);
      const next = flat[flat.findIndex((x) => x.bar.id === id) + move];
      if (next) {
        select(next.bar.id);
        setEntry({ barId: next.bar.id });
      } else {
        setEntry(null);
      }
      return null;
    },
    [song, edit, cellsOf],
  );

  // The focus bar's rhythm as steps, for the inspector's grid.
  const focusRhythm = useMemo(() => {
    const r = sel ? findBar(song, sel.focus) : null;
    if (!r) return null;
    const sec = song.sections[r.section]!;
    const bar = sec.bars[r.bar]!;
    return gridOfRhythm(barRhythm(patternById(song, barPatternId(sec, bar)), bar.chords, song.time, bar.rhythm), song.time);
  }, [song, sel]);

  const onOpen = (id: string, zone: Zone) => {
    select(id);
    if (zone === "chord") setEntry({ barId: id });
    else setFocusCue({ which: zone, n: Date.now() });
  };

  // The keyboard, when no text box has it.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const mod = ev.metaKey || ev.ctrlKey;
      const k = ev.key;
      if (mod && k.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && k.toLowerCase() === "y") {
        ev.preventDefault();
        store.redo();
        return;
      }
      if (!sel) {
        // Nothing selected: an arrow or a chord letter starts at bar 1.
        const firstId = allBars(song)[0]?.bar.id;
        if (firstId && (k.startsWith("Arrow") || k === "Enter")) {
          ev.preventDefault();
          select(firstId);
        }
        return;
      }
      if (mod && k.toLowerCase() === "c") {
        clipboard.current = copyBars(song, ids);
        ev.preventDefault();
        return;
      }
      if (mod && k.toLowerCase() === "v" && clipboard.current.length) {
        ev.preventDefault();
        const r = pasteBars(song, ids[0]!, clipboard.current);
        edit(() => r.song);
        if (r.ids.length) setSel({ anchor: r.ids[0]!, focus: r.ids[r.ids.length - 1]! });
        return;
      }
      if (mod) return;
      const flat = allBars(song).map((x) => x.bar.id);
      const at = flat.indexOf(sel.focus);
      let to: string | null | undefined;
      if (k === "ArrowRight") to = flat[at + 1];
      else if (k === "ArrowLeft") to = flat[at - 1];
      else if (k === "ArrowUp") to = verticalNeighbour(pages, sel.focus, -1);
      else if (k === "ArrowDown") to = verticalNeighbour(pages, sel.focus, 1);
      if (k.startsWith("Arrow")) {
        ev.preventDefault();
        if (to) setSel(ev.shiftKey ? { anchor: sel.anchor, focus: to } : { anchor: to, focus: to });
        return;
      }
      if (k === "Enter") {
        ev.preventDefault();
        select(sel.focus);
        setEntry({ barId: sel.focus });
      } else if (/^[a-gA-G%nN]$/.test(k)) {
        // Typing a chord over a selected bar replaces it, as typing over a selected cell does.
        ev.preventDefault();
        select(sel.focus);
        setEntry({ barId: sel.focus, seed: k });
      } else if (k === "Backspace" || k === "Delete") {
        ev.preventDefault();
        edit((s) => clearChords(s, ids));
      } else if (k === "Escape") {
        setSel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, sel, ids, song, pages, edit]);

  const firstSection = ids[0] ? findBar(song, ids[0])?.section : undefined;
  const activeSection = firstSection !== undefined ? song.sections[firstSection]!.id : null;

  const actions: InspectorActions = {
    openChords: () => sel && setEntry({ barId: sel.focus }),
    setCue: (which, text) => ids[0] && edit((s) => updateBar(s, ids[0]!, { [which]: text })),
    setRhythm: (pid) => edit((s) => setBarsPattern(s, ids, pid)),
    setSteps: (steps) => edit((s) => setBarsRhythm(s, ids, textFromGrid(steps, s.time))),
    saveRhythm: (name, text) => {
      const r = saveRhythmAsPattern(song, ids, name, text);
      edit(() => r.song);
    },
    setRepeatStart: (on) => ids[0] && edit((s) => updateBar(s, ids[0]!, { repeatStart: on ? true : undefined })),
    setRepeatEnd: (on) => ids[0] && edit((s) => updateBar(s, ids[ids.length - 1]!, { repeatEnd: on ? { times: 2 } : undefined })),
    setRepeat: (on) => edit((s) => setRepeat(s, ids, on)),
    setRepeatTimes: (n) => edit((s) => updateBar(s, ids[ids.length - 1]!, { repeatEnd: { times: Math.min(16, Math.max(2, n)) } })),
    toggleEnding: (n) => edit((s) => toggleEnding(s, ids, n)),
    setMarker: (m) => ids[0] && edit((s) => updateBar(s, ids[0]!, { marker: m })),
    setJump: (j) => ids[0] && edit((s) => updateBar(s, ids[0]!, { jump: j })),
    insertBar: (before) => {
      const at = before ? ids[0] : ids[ids.length - 1];
      if (!at) return;
      const r = insertBar(song, at, before);
      edit(() => r.song);
      select(r.id);
    },
    deleteBars: () => {
      const flat = allBars(song).map((x) => x.bar.id);
      const after = flat[flat.indexOf(ids[ids.length - 1]!) + 1] ?? flat[flat.indexOf(ids[0]!) - 1];
      edit((s) => deleteBars(s, ids));
      if (after) select(after);
      else setSel(null);
    },
  };

  const form: FormActions = {
    select: (id) => {
      const s = song.sections.find((x) => x.id === id);
      if (s) setSel({ anchor: s.bars[0]!.id, focus: s.bars[s.bars.length - 1]!.id });
    },
    rename: (id, name) => edit((s) => updateSection(s, id, { name })),
    setBars: (id, n) => edit((s) => setBarCount(s, id, n)),
    move: (id, by) => edit((s) => moveSection(s, id, by)),
    duplicate: (id) => {
      const r = duplicateSection(song, id);
      if (!r) return;
      edit(() => r.song);
      setSel({ anchor: r.section.bars[0]!.id, focus: r.section.bars[r.section.bars.length - 1]!.id });
    },
    remove: (id) => {
      edit((s) => deleteSection(s, id));
      setSel(null);
    },
    add: (name) => {
      const after = firstSection ?? song.sections.length - 1;
      const r = addSection(song, after, name);
      edit(() => r.song);
      // Straight into its first bar, box open: the next thing to do is type its chords.
      select(r.section.bars[0]!.id);
      setEntry({ barId: r.section.bars[0]!.id });
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
        <FormPanel song={song} active={activeSection} a={form} />
        <main
          className="scroller"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSel(null);
              setEntry(null);
            }
          }}
        >
          {fonts && (
            <Sheet
              song={song}
              pages={pages}
              selected={selected}
              focus={sel?.focus ?? null}
              entry={entry}
              editingMeta={meta}
              onPress={(id, extend) => {
                setEntry(null);
                setSel((cur) => (extend && cur ? { anchor: cur.anchor, focus: id } : { anchor: id, focus: id }));
              }}
              onOpen={onOpen}
              cellsOf={cellsOf}
              onCommitCells={onCommitCells}
              onCancelEntry={() => setEntry(null)}
              onEditMeta={setMeta}
              onCommitMeta={(which, v) => {
                const text = v.trim();
                if (text !== song[which]) edit((s) => ({ ...s, [which]: text }));
                setMeta(null);
              }}
            />
          )}
        </main>
        <Inspector song={song} ids={ids} chordsText={sel ? chordText(sel.focus) : ""} steps={focusRhythm} focusCue={focusCue} onCueFocused={() => setFocusCue(null)} a={actions} />
      </div>
    </div>
  );
}

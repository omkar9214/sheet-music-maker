/**
 * The chart maker (AGENTS.md §0, decisions 2–3), editor redesigned in decision 5: the Form panel
 * holds the sections, the page is selected bar by bar like a spreadsheet, and the inspector acts on
 * the selection. Decisions 7–8 added sharing, key/meter/tempo changes, chord views, parts and
 * written notes. The keyboard does the transcribing:
 *
 *   ←/→ ↑/↓   move (⇧ extends)        A–G, %, N   start typing chords into the bar
 *   Enter     edit the bar's chords   Enter/Tab   in the boxes: store, next bar (⇧: previous)
 *   ⌫         clear chords            ⌘C / ⌘V     copy / paste bars
 *   Esc       deselect                ⌘Z / ⇧⌘Z    undo / redo
 *
 * Writing notes (the Notes palette, bottom left):
 *   1–5 length · A–G note (⇧ adds to the chord) · ↑/↓ semitone · ⌘↑/⌘↓ octave · 0 rest · . dot ·
 *   T tie · ⌫ take back · ←/→ move · Esc done
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { barText, chordCells, type ChordView } from "./core/chord";
import { barContexts, type BarContext } from "./core/context";
import {
  nearestOctave, pitchOf, restBar, runBefore, shiftSemitone, signatureAcc, stepOf, updateRun, withStarts,
  writeAt, writtenOf, type NoteRun, type Written,
} from "./core/notes";
import { concertKey, partSong, type Part } from "./core/part";
import { barRhythm, gridOfRhythm, textFromGrid } from "./core/rhythm";
import {
  addSection, allBars, barPatternId, barRange, clearChords, copyBars, deleteBars, deletePattern,
  deleteSection, duplicateSection, findBar, insertBar, moveSection, pasteBars, patternById,
  saveRhythmAsPattern, setBarCells, setBarCount, setBarNotes, setBarsPattern, setBarsRhythm,
  setKeyChange, setKeyKeepChords, setPatterns, setRepeat, setTempoChange, setTime, setTimeChange,
  setTimeForBars, toggleEnding, transpose, updateBar, updateSection, type Bar, type BarClip, type Song,
} from "./core/song";
import { barTicks } from "./core/ticks";
import { FormPanel, type FormActions } from "./ui/FormPanel";
import { Inspector, type InspectorActions } from "./ui/Inspector";
import { NotesPanel, valueTicks, type NoteInputState, type NotesActions } from "./ui/NotesPanel";
import { Sheet, type Entry, type Zone } from "./ui/Sheet";
import { TopBar } from "./ui/TopBar";
import { layoutSong, type PageLayout } from "./ui/engrave/layout";
import { measureText, useFontsReady } from "./ui/engrave/measure";
import { importFile, shareLink, takeSharedChart } from "./ui/sharing";
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

/** View choices are this viewer's, not the chart's: kept in this browser only. */
const VIEW_KEY = "smm.view";
function loadView(): { view: ChordView; part: Part } {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}") as { view?: ChordView; part?: Part };
    return { view: v.view ?? "letters", part: v.part ?? "concert" };
  } catch {
    return { view: "letters", part: "concert" };
  }
}

export function App() {
  const store = useChartStore();
  const { song, edit } = store;
  const fonts = useFontsReady();
  const [sel, setSel] = useState<Selection | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [meta, setMeta] = useState<"title" | "source" | null>(null);
  const [focusCue, setFocusCue] = useState<{ which: "above" | "below"; n: number } | null>(null);
  const [noteIn, setNoteIn] = useState<NoteInputState | null>(null);
  const [{ view, part }, setViewState] = useState(loadView);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const clipboard = useRef<BarClip[]>([]);

  const setView = (next: { view: ChordView; part: Part }) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(next));
    } catch {
      // A view preference that cannot be saved is still applied for this visit.
    }
  };
  const say = useCallback((text: string, bad = false) => setToast({ text, bad }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.bad ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // The chart as shown: transposed for the chosen part (decision 7). Its chords and notes are the
  // same degrees as the concert chart's, so what is typed in the part's key is stored right.
  const viewSong = useMemo(() => partSong(song, part), [song, part]);
  const ctx = useMemo(() => barContexts(viewSong), [viewSong]);
  const ctxOf = useCallback((id: string): BarContext => ctx.get(id)!, [ctx]);
  const pages = useMemo(() => (fonts ? layoutSong(viewSong, measureText, view) : []), [viewSong, fonts, view]);
  const ids = useMemo(() => (sel ? barRange(song, sel.anchor, sel.focus) : []), [song, sel]);
  const selected = useMemo(() => new Set(ids), [ids]);

  // A selection that no longer exists (undo, delete, another chart) is dropped, not kept dangling.
  useEffect(() => {
    if (sel && (!findBar(song, sel.anchor) || !findBar(song, sel.focus))) setSel(null);
    if (entry && !findBar(song, entry.barId)) setEntry(null);
    if (noteIn && !findBar(song, noteIn.barId)) setNoteIn(null);
  }, [song, sel, entry, noteIn]);
  useEffect(() => {
    document.title = song.title ? `${song.title} — Sheet Music Maker` : "Sheet Music Maker";
  }, [song.title]);

  // Opened from a share link: the chart in the link is added as a new chart (decision 7).
  useEffect(() => {
    void takeSharedChart().then((r) => {
      if (!r) return;
      if (r.ok) {
        store.add(r.song);
        say(`Opened “${r.song.title}”`);
      } else say(r.error, true);
    });
    // Once, on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const f of Array.from(files)) {
        const r = await importFile(f);
        if (r.ok) {
          store.add(r.song);
          say(r.note ? `Imported “${r.song.title}” · ${r.note}` : `Imported “${r.song.title}”`, !!r.note);
        } else say(r.error, true);
      }
    },
    [store, say],
  );

  // Dropping a file anywhere on the window imports it.
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      void onFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [onFiles]);

  const onShare = async () => {
    try {
      const url = await shareLink(song);
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {
      say("Couldn't copy the link", true);
    }
  };

  const select = (id: string) => setSel({ anchor: id, focus: id });

  const chordText = useCallback(
    (id: string) => {
      const b = barOf(viewSong, id);
      const c = ctx.get(id);
      return b && c ? barText(b.chords, c.key, c.time) : "";
    },
    [viewSong, ctx],
  );

  const cellsOf = useCallback(
    (id: string) => {
      const c = ctxOf(id);
      return chordCells(barOf(viewSong, id)?.chords ?? [], c.key, c.time);
    },
    [viewSong, ctxOf],
  );

  const onCommitCells = useCallback(
    (id: string, cells: string[], cellTicks: number, move: 1 | -1 | 0) => {
      const before = cellsOf(id);
      const changed = cellTicks !== before.cellTicks || cells.some((c, i) => c.trim() !== before.cells[i]);
      if (changed) {
        const r = setBarCells(song, id, cells, cellTicks, ctxOf(id).key);
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
    [song, edit, cellsOf, ctxOf],
  );

  // The focus bar's rhythm as steps, for the inspector's grid.
  const focusRhythm = useMemo(() => {
    const r = sel ? findBar(song, sel.focus) : null;
    if (!r) return null;
    const sec = song.sections[r.section]!;
    const bar = sec.bars[r.bar]!;
    const time = ctxOf(bar.id).time;
    return gridOfRhythm(barRhythm(patternById(song, barPatternId(sec, bar)), bar.chords, time, bar.rhythm), time);
  }, [song, sel, ctxOf]);

  const onOpen = (id: string, zone: Zone) => {
    select(id);
    setNoteIn(null);
    if (zone === "chord") setEntry({ barId: id });
    else setFocusCue({ which: zone, n: Date.now() });
  };

  /* ---------------------------------------------------------------- written notes (decision 8) */

  const flatIds = useMemo(() => allBars(song).map((x) => x.bar.id), [song]);
  const runsOf = (id: string): NoteRun[] => barOf(song, id)?.notes ?? restBar(ctxOf(id).time);

  /** The note before the cursor, here or at the end of the bar before: what ↑ ↓ ⌫ T ♯ act on. */
  const lastNote = (): { barId: string; run: number } | null => {
    if (!noteIn) return null;
    const here = runBefore(runsOf(noteIn.barId), noteIn.cursor);
    if (here >= 0) return { barId: noteIn.barId, run: here };
    const prev = flatIds[flatIds.indexOf(noteIn.barId) - 1];
    const prevBar = prev ? barOf(song, prev) : undefined;
    if (prev && prevBar?.notes) {
      const i = runBefore(prevBar.notes, Infinity);
      if (i >= 0) return { barId: prev, run: i };
    }
    return null;
  };

  /** Moves the cursor on, into the next bar at the barline. */
  const advance = (id: string, next: number) => {
    const total = barTicks(ctxOf(id).time);
    const nextBar = flatIds[flatIds.indexOf(id) + 1];
    if (next >= total && nextBar) {
      setNoteIn((n) => (n ? { ...n, barId: nextBar, cursor: 0 } : n));
      select(nextBar);
    } else {
      setNoteIn((n) => (n ? { ...n, cursor: Math.min(next, total) } : n));
    }
  };

  const write = (pitches: NoteRun["pitches"] | null) => {
    if (!noteIn) return;
    const id = noteIn.barId;
    const c = ctxOf(id);
    if (noteIn.cursor >= barTicks(c.time)) return;
    const r = writeAt(barOf(song, id)?.notes, c.time, noteIn.cursor, valueTicks(noteIn.value, noteIn.dotted), pitches);
    edit((s) => setBarNotes(s, id, r.runs));
    advance(id, r.next);
  };

  const editLast = (f: (w: Written, c: BarContext) => Written | null, all = false) => {
    const last = lastNote();
    if (!last) return;
    const c = ctxOf(last.barId);
    const runs = runsOf(last.barId);
    const run = runs[last.run]!;
    const pitches = run.pitches.map((p, i) => {
      if (!all && i !== run.pitches.length - 1) return p;
      const w = f(writtenOf(p, c), c);
      return w ? pitchOf(w, c) : p;
    });
    edit((s) => setBarNotes(s, last.barId, updateRun(runs, last.run, { pitches })));
  };

  const letter = (l: number, addToChord: boolean) => {
    if (!noteIn) return;
    const c = ctxOf(noteIn.barId);
    if (addToChord) {
      const last = lastNote();
      if (!last) return;
      const lc = ctxOf(last.barId);
      const runs = runsOf(last.barId);
      const run = runs[last.run]!;
      const top = run.pitches.map((p) => writtenOf(p, lc)).reduce((a, b) => (stepOf(b) > stepOf(a) ? b : a));
      let octave = top.octave;
      if (octave * 7 + l <= stepOf(top)) octave++;
      const p = pitchOf({ letter: l, acc: signatureAcc(l, lc.key), octave }, lc);
      edit((s) => setBarNotes(s, last.barId, updateRun(runs, last.run, { pitches: [...run.pitches, p] })));
      return;
    }
    // Nearest the note before; the first note of all goes nearest the staff's middle line.
    const last = lastNote();
    const lc = last ? ctxOf(last.barId) : c;
    const prevRun = last ? runsOf(last.barId)[last.run] : undefined;
    const near: Written = prevRun
      ? writtenOf(prevRun.pitches[prevRun.pitches.length - 1]!, lc)
      : song.clef === "bass"
        ? { letter: 1, acc: 0, octave: 3 }
        : { letter: 6, acc: 0, octave: 4 };
    const octave = nearestOctave(l, near);
    write([pitchOf({ letter: l, acc: signatureAcc(l, c.key), octave }, c)]);
  };

  const moveCursor = (dir: 1 | -1) => {
    if (!noteIn) return;
    const starts = withStarts(runsOf(noteIn.barId)).map((r) => r.start);
    const total = barTicks(ctxOf(noteIn.barId).time);
    const i = flatIds.indexOf(noteIn.barId);
    if (dir > 0) {
      const next = starts.find((t) => t > noteIn.cursor);
      if (next !== undefined) setNoteIn({ ...noteIn, cursor: next });
      else if (flatIds[i + 1]) {
        setNoteIn({ ...noteIn, barId: flatIds[i + 1]!, cursor: 0 });
        select(flatIds[i + 1]!);
      } else setNoteIn({ ...noteIn, cursor: total });
    } else {
      const prev = [...starts].reverse().find((t) => t < noteIn.cursor);
      if (prev !== undefined) setNoteIn({ ...noteIn, cursor: prev });
      else if (flatIds[i - 1]) {
        const pid = flatIds[i - 1]!;
        const ps = withStarts(runsOf(pid)).map((r) => r.start);
        setNoteIn({ ...noteIn, barId: pid, cursor: ps[ps.length - 1] ?? 0 });
        select(pid);
      }
    }
  };

  const notesActions: NotesActions = {
    setMode: (on) => {
      const id = noteIn?.barId ?? sel?.focus;
      if (!id) return;
      if (on) {
        if (!barOf(song, id)?.notes) edit((s) => setBarNotes(s, id, restBar(ctxOf(id).time)));
        setNoteIn({ barId: id, cursor: 0, value: noteIn?.value ?? 3, dotted: false });
        setEntry(null);
      } else {
        edit((s) => setBarNotes(s, id, null));
        setNoteIn(null);
      }
    },
    setValue: (v) => setNoteIn((n) => (n ? { ...n, value: v, dotted: v === 5 ? false : n.dotted } : n)),
    toggleDot: () => setNoteIn((n) => (n && n.value !== 5 ? { ...n, dotted: !n.dotted } : n)),
    rest: () => write(null),
    tie: () => {
      const last = lastNote();
      if (!last) return;
      const runs = runsOf(last.barId);
      edit((s) => setBarNotes(s, last.barId, updateRun(runs, last.run, { tie: !runs[last.run]!.tie })));
    },
    accidental: (acc) => editLast((w) => ({ ...w, acc })),
    octave: (dir) => editLast((w) => ({ ...w, octave: w.octave + dir }), true),
    undoNote: () => {
      const last = lastNote();
      if (!last) return;
      const runs = runsOf(last.barId);
      const start = withStarts(runs)[last.run]!.start;
      edit((s) => setBarNotes(s, last.barId, updateRun(runs, last.run, { rest: true })));
      setNoteIn((n) => (n ? { ...n, barId: last.barId, cursor: start } : n));
      select(last.barId);
    },
    stop: () => setNoteIn(null),
  };

  /* ---------------------------------------------------------------------------------- keyboard */

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
      // Note input owns the keyboard while it is on (decision 8).
      if (noteIn) {
        const handled = (() => {
          if (mod && (k === "ArrowUp" || k === "ArrowDown")) return notesActions.octave(k === "ArrowUp" ? 1 : -1), true;
          if (mod) return false;
          if (/^[1-5]$/.test(k)) return notesActions.setValue(Number(k) as NoteInputState["value"]), true;
          if (k === ".") return notesActions.toggleDot(), true;
          if (k === "0" || k.toLowerCase() === "r") return notesActions.rest(), true;
          if (k.toLowerCase() === "t") return notesActions.tie(), true;
          if (/^[a-g]$/i.test(k)) return letter("cdefgab".indexOf(k.toLowerCase()), ev.shiftKey), true;
          if (k === "ArrowUp" || k === "ArrowDown") {
            return editLast((w, c) => shiftSemitone(w, k === "ArrowUp" ? 1 : -1, c.key)), true;
          }
          if (k === "ArrowRight" || k === "ArrowLeft") return moveCursor(k === "ArrowRight" ? 1 : -1), true;
          if (k === "Backspace" || k === "Delete") return notesActions.undoNote(), true;
          if (k === "Escape") return setNoteIn(null), true;
          return false;
        })();
        if (handled) ev.preventDefault();
        return;
      }
      if (!sel) {
        // Nothing selected: an arrow or Enter starts at bar 1.
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
      const at = flatIds.indexOf(sel.focus);
      let to: string | null | undefined;
      if (k === "ArrowRight") to = flatIds[at + 1];
      else if (k === "ArrowLeft") to = flatIds[at - 1];
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
  });

  /* --------------------------------------------------------------------------------- actions */

  const firstSection = ids[0] ? findBar(song, ids[0])?.section : undefined;
  const activeSection = firstSection !== undefined ? song.sections[firstSection]!.id : null;

  const actions: InspectorActions = {
    openChords: () => sel && setEntry({ barId: sel.focus }),
    setCue: (which, text) => ids[0] && edit((s) => updateBar(s, ids[0]!, { [which]: text })),
    setRhythm: (pid) => edit((s) => setBarsPattern(s, ids, pid)),
    setSteps: (steps) => ids[0] && edit((s) => setBarsRhythm(s, ids, textFromGrid(steps, ctxOf(ids[0]!).time))),
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
    // The key is picked as shown; in a part view that is the part's key, so it is moved back to
    // concert by the same interval before it is stored.
    setKeyChange: (k) => ids[0] && edit((s) => setKeyChange(s, ids[0]!, k ? concertKey(k, s.key, part) : null)),
    setTime: (t) => ids[0] && edit((s) => (t ? setTimeForBars(s, ids, t) : setTimeChange(s, ids[0]!, null))),
    setTempo: (n) => ids[0] && edit((s) => setTempoChange(s, ids[0]!, n)),
    insertBar: (before) => {
      const at = before ? ids[0] : ids[ids.length - 1];
      if (!at) return;
      const r = insertBar(song, at, before);
      edit(() => r.song);
      select(r.id);
    },
    deleteBars: () => {
      const after = flatIds[flatIds.indexOf(ids[ids.length - 1]!) + 1] ?? flatIds[flatIds.indexOf(ids[0]!) - 1];
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

  const panelBar = noteIn?.barId ?? (ids.length === 1 ? ids[0]! : null);

  return (
    <div className="app">
      <TopBar
        store={store}
        view={view}
        onView={(v) => setView({ view: v, part })}
        part={part}
        onPart={(p) => setView({ view, part: p })}
        onFiles={(f) => void onFiles(f)}
        onShare={() => void onShare()}
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
        <FormPanel
          song={song}
          active={activeSection}
          a={form}
          bottom={
            panelBar ? (
              <NotesPanel isNotes={!!barOf(song, panelBar)?.notes} input={noteIn} a={notesActions} />
            ) : undefined
          }
        />
        <main
          className="scroller"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSel(null);
              setEntry(null);
              setNoteIn(null);
            }
          }}
        >
          {part !== "concert" && <div className="part-badge">Part · {partLabel(part)}</div>}
          {fonts && (
            <Sheet
              song={viewSong}
              pages={pages}
              selected={selected}
              focus={sel?.focus ?? null}
              entry={entry}
              editingMeta={meta}
              noteCursor={noteIn ? { barId: noteIn.barId, tick: noteIn.cursor } : null}
              onPress={(id, extend) => {
                setEntry(null);
                if (noteIn && !extend) {
                  setNoteIn({ ...noteIn, barId: id, cursor: 0 });
                  select(id);
                  return;
                }
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
        <Inspector
          song={song}
          ids={ids}
          chordsText={sel ? chordText(sel.focus) : ""}
          steps={focusRhythm}
          ctx={ctxOf(ids[0] ?? flatIds[0]!)}
          focusCue={focusCue}
          onCueFocused={() => setFocusCue(null)}
          a={actions}
        />
      </div>
      {toast && <div className={toast.bad ? "toast bad" : "toast"} role="status">{toast.text}</div>}
    </div>
  );
}

function partLabel(p: Part): string {
  return p === "bb" ? "B♭" : p === "eb" ? "E♭" : p === "f" ? "F" : p.startsWith("capo") ? `Capo ${p.slice(4)}` : "Concert";
}

/**
 * Saving and undo (non-negotiable 4: "never lose the user's work").
 *
 * Every committed edit is written to localStorage at once, so a reload or a closed tab costs nothing
 * that was committed. Undo is a stack of whole Song values: edits are pure (`core/song.ts`), so a
 * snapshot is a reference, not a copy. The undo history lives in memory, so a reload keeps the chart
 * but not its history. That is a stated limit (WORKLOG), not an accident.
 *
 * Saved data that cannot be read is never overwritten. It is moved to a backup key first, so a future
 * format or a corrupt write can still be recovered by hand.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { khwabon } from "../core/khwabon";
import { emptySong, newId, type Song } from "../core/song";

export const STORAGE_KEY = "smm.library.v1";

export interface Library {
  version: 1;
  charts: Record<string, Song>;
  order: string[];
  current: string;
}

function fresh(): Library {
  const song = khwabon();
  return { version: 1, charts: { [song.id]: song }, order: [song.id], current: song.id };
}

function looksLikeSong(x: unknown): x is Song {
  const s = x as Song;
  return !!s && typeof s.title === "string" && Array.isArray(s.sections) && !!s.key && !!s.time && Array.isArray(s.patterns);
}

/** `safeToWrite` is false only when unreadable data could not be backed up: then nothing is written
 * until the first edit, so the original survives a session spent only reading. */
export function readLibrary(storage: Pick<Storage, "getItem" | "setItem">): { lib: Library; safeToWrite: boolean } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { lib: fresh(), safeToWrite: false };
  }
  if (raw === null) return { lib: fresh(), safeToWrite: true };
  try {
    const lib = JSON.parse(raw) as Library;
    if (
      lib.version === 1 &&
      lib.charts &&
      Array.isArray(lib.order) &&
      lib.order.length > 0 &&
      lib.order.every((id) => looksLikeSong(lib.charts[id])) &&
      lib.charts[lib.current]
    ) {
      return { lib, safeToWrite: true };
    }
  } catch {
    // fall through to the backup
  }
  try {
    storage.setItem(`${STORAGE_KEY}.unreadable.${Date.now()}`, raw);
    return { lib: fresh(), safeToWrite: true };
  } catch {
    return { lib: fresh(), safeToWrite: false };
  }
}

export function writeLibrary(storage: Pick<Storage, "setItem">, lib: Library): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(lib));
    return true;
  } catch {
    return false;
  }
}

const HISTORY = 300;

export interface ChartStore {
  lib: Library;
  song: Song;
  saved: boolean;
  /** Applies one edit as one undo step. A function returning the same Song is not a step. */
  edit: (f: (s: Song) => Song) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  open: (id: string) => void;
  create: () => void;
  duplicate: () => void;
  remove: (id: string) => void;
  /** Adds a chart from outside (a file, a link) and opens it. Always a new chart, never a
   * replacement (decision 7). */
  add: (song: Song) => void;
}

export function useChartStore(): ChartStore {
  const [initial] = useState(() => readLibrary(window.localStorage));
  const [lib, setLib] = useState<Library>(initial.lib);
  const [saved, setSaved] = useState(true);
  const mayWrite = useRef(initial.safeToWrite);
  const past = useRef<Song[]>([]);
  const future = useRef<Song[]>([]);
  const [, bump] = useState(0);

  useEffect(() => {
    if (lib === initial.lib && !mayWrite.current) return;
    mayWrite.current = true;
    setSaved(writeLibrary(window.localStorage, lib));
  }, [lib, initial.lib]);

  const song = lib.charts[lib.current]!;

  const put = useCallback((s: Song) => {
    setLib((l) => ({ ...l, charts: { ...l.charts, [s.id]: s } }));
  }, []);

  const edit = useCallback(
    (f: (s: Song) => Song) => {
      const next = f(song);
      if (next === song) return;
      past.current.push(song);
      if (past.current.length > HISTORY) past.current.shift();
      future.current = [];
      put(next);
    },
    [song, put],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(song);
    put(prev);
  }, [song, put]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(song);
    put(next);
  }, [song, put]);

  const switchTo = (l: Library) => {
    past.current = [];
    future.current = [];
    setLib(l);
    bump((n) => n + 1);
  };

  return {
    lib,
    song,
    saved,
    edit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    open: (id) => lib.charts[id] && switchTo({ ...lib, current: id }),
    create: () => {
      const s = emptySong();
      switchTo({ ...lib, charts: { ...lib.charts, [s.id]: s }, order: [s.id, ...lib.order], current: s.id });
    },
    duplicate: () => {
      const s: Song = { ...structuredClone(song), id: newId("s"), title: `${song.title} (copy)` };
      switchTo({ ...lib, charts: { ...lib.charts, [s.id]: s }, order: [s.id, ...lib.order], current: s.id });
    },
    add: (song) => {
      past.current = [];
      future.current = [];
      // Functional: an import can finish after other edits, and must not undo them.
      setLib((l) => ({ ...l, charts: { ...l.charts, [song.id]: song }, order: [song.id, ...l.order], current: song.id }));
      bump((n) => n + 1);
    },
    remove: (id) => {
      if (lib.order.length <= 1) return;
      const charts = { ...lib.charts };
      delete charts[id];
      const order = lib.order.filter((x) => x !== id);
      switchTo({ ...lib, charts, order, current: lib.current === id ? order[0]! : lib.current });
    },
  };
}

/**
 * Moving charts between people (decision 7): files out, files in, and the share link. The formats
 * live in `core/exchange`. This is only the browser's side: downloads, the file picker and the
 * clipboard.
 */
import { fromChordPro, toChordPro } from "../core/exchange/chordpro";
import { SHARE_PARAM, chartFile, readChartFile, readShareCode, shareCode } from "../core/exchange/file";
import { toMusicXML } from "../core/exchange/musicxml";
import type { Song } from "../core/song";

function safeName(title: string): string {
  return (title.trim() || "Untitled").replace(/[\\/:*?"<>|]+/g, " ").trim();
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportChart(song: Song) {
  download(`${safeName(song.title)}.chart.json`, chartFile(song), "application/json");
}

export function exportChordPro(song: Song) {
  download(`${safeName(song.title)}.cho`, toChordPro(song), "text/plain");
}

export function exportMusicXML(song: Song) {
  download(`${safeName(song.title)}.musicxml`, toMusicXML(song), "application/vnd.recordare.musicxml+xml");
}

export type Imported = { ok: true; song: Song; note?: string } | { ok: false; error: string };

/** A file someone sent: a chart file, or ChordPro. Decided by content first, then by name. */
export async function importFile(file: File): Promise<Imported> {
  const text = await file.text();
  if (text.trimStart().startsWith("{\"format\"") || /\.json$/i.test(file.name)) {
    const r = readChartFile(text);
    return r.ok ? r : { ok: false, error: `Couldn't import ${file.name}: ${r.error}` };
  }
  if (/\.(cho|chopro|chordpro|crd|pro|txt)$/i.test(file.name) || /\{\s*(title|t|start_of_grid|sog)\b/.test(text)) {
    const r = fromChordPro(text);
    if (!r.ok) return { ok: false, error: `Couldn't import ${file.name}: ${r.error}` };
    const note = r.skipped.length ? `${r.skipped.length} chord${r.skipped.length > 1 ? "s" : ""} not read: ${r.skipped.slice(0, 4).join(", ")}` : undefined;
    return note ? { ok: true, song: r.song, note } : { ok: true, song: r.song };
  }
  return { ok: false, error: `Couldn't import ${file.name}` };
}

export async function shareLink(song: Song): Promise<string> {
  const url = new URL(window.location.href);
  url.hash = `${SHARE_PARAM}=${await shareCode(song)}`;
  return url.toString();
}

/** A chart in the address bar's fragment, if the page was opened from a share link. The fragment is
 * cleared once read, so a reload does not import it again. */
export async function takeSharedChart(): Promise<Imported | null> {
  const m = new RegExp(`(?:^#|&)${SHARE_PARAM}=([A-Za-z0-9_-]+)`).exec(window.location.hash);
  if (!m) return null;
  history.replaceState(null, "", window.location.pathname + window.location.search);
  const r = await readShareCode(m[1]!);
  return r.ok ? r : { ok: false, error: "Couldn't read that link" };
}

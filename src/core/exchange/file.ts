/**
 * The chart file and the share link (decision 7: *"Add an option to import as well (working with
 * people)"*). Both carry the whole Song, losslessly, with no server (AGENTS.md §6). Non-negotiable
 * 5: what is exported imports back identical, which is tested on his real chart.
 */
import { newId, type Song } from "../song";

export const FORMAT = "sheet-music-maker";
export const VERSION = 1;

export function chartFile(song: Song): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, song }, null, 1);
}

export type Read = { ok: true; song: Song } | { ok: false; error: string };

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/**
 * A structural check, deep enough that nothing the app reads is missing. It does not trust the file:
 * a file someone else made is input, and a bad one must fail here, not three screens later.
 */
export function validSong(x: unknown): x is Song {
  if (!isObj(x)) return false;
  const k = x.key as Record<string, unknown> | undefined;
  const t = x.time as Record<string, unknown> | undefined;
  if (typeof x.title !== "string" || typeof x.tempo !== "number" || !isObj(k) || !isObj(k.tonic) || !isObj(t)) return false;
  if (typeof t.beats !== "number" || ![2, 4, 8].includes(t.unit as number)) return false;
  if (!Array.isArray(x.patterns) || !Array.isArray(x.sections) || x.sections.length === 0) return false;
  return x.sections.every(
    (s: unknown) =>
      isObj(s) && typeof s.name === "string" && typeof s.id === "string" && Array.isArray(s.bars) && s.bars.length > 0 &&
      s.bars.every((b: unknown) => isObj(b) && typeof b.id === "string" && Array.isArray(b.chords)),
  );
}

/** A chart from a file. It gets a new id, so importing the same file twice gives two charts, never
 * one overwriting the other. */
export function readChartFile(text: string): Read {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not a chart file" };
  }
  if (!isObj(data) || data.format !== FORMAT) return { ok: false, error: "not a chart file" };
  if (typeof data.version !== "number" || data.version > VERSION) return { ok: false, error: "made by a newer version" };
  if (!validSong(data.song)) return { ok: false, error: "the chart inside is damaged" };
  return { ok: true, song: { ...data.song, id: newId("s") } };
}

/* The share link: the file, deflated and base64url'd into the URL's fragment, which browsers never
 * send to a server. A 73-bar chart is a few kilobytes. */

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const SHARE_PARAM = "chart";

export async function shareCode(song: Song): Promise<string> {
  return toB64url(await pipe(new TextEncoder().encode(chartFile(song)), new CompressionStream("deflate-raw")));
}

export async function readShareCode(code: string): Promise<Read> {
  try {
    const bytes = await pipe(fromB64url(code), new DecompressionStream("deflate-raw"));
    return readChartFile(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: "the link is damaged" };
  }
}

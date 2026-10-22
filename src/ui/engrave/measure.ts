/**
 * Text widths for layout, from the real fonts. Layout waits for Leland and Edwin to load: measured
 * against a fallback font, every chord and cue width would be wrong by the difference, and it would
 * stay wrong until the next edit.
 */
import { useEffect, useState } from "react";
import type { Measure } from "./layout";
import { MUSIC_FONT, TEXT_FONT } from "./metrics";

let ctx: CanvasRenderingContext2D | null = null;

export const measureText: Measure = (text, size, style) => {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.5;
  ctx.font = `${style?.italic ? "italic " : ""}${style?.bold ? "bold " : ""}${size}px ${TEXT_FONT}`;
  return ctx.measureText(text).width;
};

export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([
      document.fonts.load(`20px ${MUSIC_FONT}`, ""),
      document.fonts.load(`10px ${TEXT_FONT}`),
      document.fonts.load(`bold 10px ${TEXT_FONT}`),
      document.fonts.load(`italic 10px ${TEXT_FONT}`),
    ])
      .catch(() => undefined)
      .then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

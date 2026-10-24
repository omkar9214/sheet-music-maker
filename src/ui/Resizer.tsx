/**
 * The drag handle on a sidebar's inner edge (decision 14). Double-click restores the default width.
 * Pointer capture keeps the drag alive when the pointer runs over the page's SVG.
 */
import { useRef } from "react";
import { clampWidth, DEFAULT_WIDTHS, type PanelSide } from "./panels";

export function Resizer({ side, width, onChange }: { side: PanelSide; width: number; onChange: (w: number) => void }) {
  const start = useRef<{ x: number; w: number } | null>(null);
  // The Form panel grows to the right, the inspector to the left.
  const dir = side === "form" ? 1 : -1;
  return (
    <div
      // Not a bare `${side}`: "inspector" matched `.inspector` and took its padding, 9 px → 29 px.
      className={`resizer resizer-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "form" ? "Resize form panel" : "Resize inspector"}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, w: width };
        document.body.classList.add("resizing");
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        onChange(clampWidth(side, start.current.w + dir * (e.clientX - start.current.x)));
      }}
      onPointerUp={() => {
        if (!start.current) return;
        start.current = null;
        document.body.classList.remove("resizing");
      }}
      onDoubleClick={() => {
        onChange(DEFAULT_WIDTHS[side]);
      }}
    />
  );
}

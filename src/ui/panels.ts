/**
 * Sidebar widths (decision 14: "size bars should be resizable", read as side bars). They belong to
 * this viewer, not the chart, so they live under their own key and never inside the chart library
 * his score is saved in.
 */
export type PanelSide = "form" | "inspector";
export interface PanelWidths {
  form: number;
  inspector: number;
}

/** The widths before decision 14, so nothing moves until a handle is dragged. */
export const DEFAULT_WIDTHS: PanelWidths = { form: 220, inspector: 300 };

/** Below these the Form panel's name, count and tools stop fitting on one row (the − 16 + stepper
 * and ↑ ↓ ⧉ × are about 150 px), and the inspector's 16-step rhythm grid (about 250 px) clips.
 * Above the maxima the page loses more than it gains (inference). */
export const LIMITS: Record<PanelSide, { min: number; max: number }> = {
  form: { min: 170, max: 420 },
  inspector: { min: 260, max: 560 },
};

export const PANELS_KEY = "smm.panels";

export function clampWidth(side: PanelSide, w: number): number {
  const { min, max } = LIMITS[side];
  return Math.round(Math.min(max, Math.max(min, w)));
}

export function readWidths(storage: Pick<Storage, "getItem">): PanelWidths {
  try {
    const v = JSON.parse(storage.getItem(PANELS_KEY) ?? "{}") as Partial<PanelWidths>;
    return {
      form: typeof v.form === "number" ? clampWidth("form", v.form) : DEFAULT_WIDTHS.form,
      inspector: typeof v.inspector === "number" ? clampWidth("inspector", v.inspector) : DEFAULT_WIDTHS.inspector,
    };
  } catch {
    return { ...DEFAULT_WIDTHS };
  }
}

export function writeWidths(storage: Pick<Storage, "setItem">, w: PanelWidths): void {
  try {
    storage.setItem(PANELS_KEY, JSON.stringify(w));
  } catch {
    // A width that cannot be saved still applies for this visit.
  }
}

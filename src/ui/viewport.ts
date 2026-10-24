/**
 * Phones and tablets (decision 18: "make it solid for android phones, ipads, iphones etc").
 *
 * Below COMPACT_MAX the three columns do not fit: the Form panel (220) and the inspector (300) leave
 * a 1024-px iPad 504 px for a 796-px page, and a 375-px phone measured 32 px, with the inspector off
 * screen. So below it the Form panel becomes a drawer, the inspector a sheet from the bottom, and the
 * page fits the width.
 *
 * Touch screens get it up to TOUCH_MAX as well. The three columns need 220 + 796 + 300 plus gutters,
 * about 1350 px, and an 1180-px iPad Air in landscape had 660 for the page (found while building
 * this). A laptop that narrow keeps the columns and scrolls the page, as before.
 */
import { useEffect, useState, type RefObject } from "react";

export const COMPACT_MAX = 1099;
export const TOUCH_MAX = 1365;
const QUERY = `(max-width: ${COMPACT_MAX}px), (pointer: coarse) and (max-width: ${TOUCH_MAX}px)`;

export function useCompact(): boolean {
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const f = () => setOn(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return on;
}

/** The element's content width in px, kept current through rotation and resizing. */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cs = getComputedStyle(el);
      setW(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

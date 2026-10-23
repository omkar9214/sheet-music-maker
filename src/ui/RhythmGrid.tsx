/**
 * The strum as steps (decision 6): one box per 16th, under "1 e & a". A click moves a step round
 * ring → strum → silence. A click that would change nothing on screen skips on: a ring with no strum
 * before it already reads as silence. So every click changes what is drawn.
 */
import type { Step } from "../core/rhythm";

/** What a step looks like: a ring with nothing sounding before it is silence. */
export function shownSteps(steps: readonly Step[]): Step[] {
  let sounding = false;
  return steps.map((st) => {
    if (st === "hit") sounding = true;
    else if (st === "rest") sounding = false;
    return st === "hold" && !sounding ? "rest" : st;
  });
}

const CYCLE: Record<Step, Step> = { hold: "hit", hit: "rest", rest: "hold" };

/** The next state for step `i`, skipping any that would look the same as now. */
export function clickStep(steps: readonly Step[], i: number): Step[] {
  const before = shownSteps(steps)[i];
  let next = steps[i]!;
  for (let k = 0; k < 3; k++) {
    next = CYCLE[next];
    const trial = steps.map((s, j) => (j === i ? next : s));
    if (shownSteps(trial)[i] !== before) return trial;
  }
  return [...steps];
}

const TITLE: Record<Step, string> = { hit: "Strum", hold: "Ring", rest: "Silent" };

export function RhythmGrid(props: {
  steps: readonly Step[];
  counts: readonly string[];
  beatSteps: number;
  onChange: (steps: Step[]) => void;
  compact?: boolean;
}) {
  const shown = shownSteps(props.steps);
  // 12/8 has 24 steps: two rows of half a bar each keep a box wide enough to hit.
  const perRow = shown.length > 16 ? shown.length / 2 : shown.length;
  const rows = Array.from({ length: shown.length / perRow }, (_, r) => r * perRow);
  return (
    <div className={props.compact ? "rgrid compact" : "rgrid"}>
      {rows.map((from) => (
        <div key={from} className="rgrid-row" style={{ gridTemplateColumns: `repeat(${perRow}, 1fr)` }}>
          {shown.slice(from, from + perRow).map((st, k) => {
            const i = from + k;
            const beatStart = i % props.beatSteps === 0;
            const ringFrom = st === "hold" ? "ring" : "";
            return (
              <button
                key={i}
                className={`step ${st} ${ringFrom} ${beatStart ? "beat" : ""}`}
                title={`${props.counts[i] || "·"} — ${TITLE[st]}`}
                onClick={() => props.onChange(clickStep(props.steps, i))}
              >
                <span className="mark" />
                {!props.compact && <span className="count">{props.counts[i]}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

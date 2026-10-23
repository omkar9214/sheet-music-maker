/**
 * What the selection holds, and what can be done to it (decision 5). Every control acts on all the
 * selected bars at once. A control that cannot act on this selection is not drawn (§7.2): cues and
 * signs exist for one bar, so they appear only when one bar is selected, and the repeat count only
 * on a closing repeat. Labels and values only (§7.1).
 */
import { useEffect, useRef, useState } from "react";
import type { Bar, Jump, Marker, Song } from "../core/song";
import { STEP_TICKS, stepCounts, type Step } from "../core/rhythm";
import { barPatternId, findBar } from "../core/song";
import { beatTicks } from "../core/ticks";
import { RhythmGrid } from "./RhythmGrid";

const MARKERS: Array<[Marker, string]> = [["segno", "Segno"], ["coda", "Coda"]];
const JUMPS: Array<[Jump, string]> = [
  ["toCoda", "To Coda"],
  ["dsAlCoda", "D.S. al Coda"],
  ["dcAlCoda", "D.C. al Coda"],
  ["dcAlFine", "D.C. al Fine"],
  ["fine", "Fine"],
];

export interface InspectorActions {
  openChords: () => void;
  setCue: (which: "cueAbove" | "cueBelow", text: string) => void;
  setRhythm: (patternId: string) => void;
  setSteps: (steps: Step[]) => void;
  saveRhythm: (name: string, text: string) => void;
  setRepeatStart: (on: boolean) => void;
  setRepeatEnd: (on: boolean) => void;
  setRepeat: (on: boolean) => void;
  setRepeatTimes: (n: number) => void;
  toggleEnding: (n: number) => void;
  setMarker: (m: Marker | undefined) => void;
  setJump: (j: Jump | undefined) => void;
  insertBar: (before: boolean) => void;
  deleteBars: () => void;
}

function Chip(props: { on?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button className={props.on ? "chip on" : "chip"} onClick={props.onClick} title={props.title}>
      {props.children}
    </button>
  );
}

/** A cue field: stores on Enter or on leaving it, so a cue is one undo step, not one per letter. */
function CueField(props: { label: string; value: string; focusKey: number; onFocused: () => void; onCommit: (v: string) => void }) {
  const [v, setV] = useState(props.value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setV(props.value), [props.value]);
  useEffect(() => {
    // One-shot: the request is spent once honoured. Kept alive, it re-focused this field every time
    // a single bar was selected again, and the arrow keys and ⌘V went into the field instead.
    if (props.focusKey > 0) {
      ref.current?.focus();
      ref.current?.select();
      props.onFocused();
    }
  }, [props.focusKey]);
  const done = () => v.trim() !== props.value && props.onCommit(v.trim());
  return (
    <label className="row cue">
      <span className="lbl">{props.label}</span>
      <input
        ref={ref}
        value={v}
        spellCheck={false}
        onChange={(e) => setV(e.target.value)}
        onBlur={done}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setV(props.value);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

/** "Save as pattern": a name, then the rhythm becomes a chip for use elsewhere (decision 6). */
function SavePattern({ onSave, count }: { onSave: (name: string) => void; count: number }) {
  const [name, setName] = useState<string | null>(null);
  if (name === null) {
    return (
      <button className="chip save" onClick={() => setName(`Pattern ${count - 1}`)}>
        Save as pattern
      </button>
    );
  }
  const done = () => {
    if (name.trim()) onSave(name.trim());
    setName(null);
  };
  return (
    <input
      className="save-input"
      autoFocus
      value={name}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") done();
        if (e.key === "Escape") setName(null);
      }}
      onBlur={done}
    />
  );
}

export function Inspector(props: {
  song: Song;
  ids: readonly string[];
  chordsText: string;
  /** The focus bar's rhythm as steps. */
  steps: Step[] | null;
  focusCue: { which: "above" | "below"; n: number } | null;
  onCueFocused: () => void;
  a: InspectorActions;
}) {
  const { song, ids, a } = props;
  const bars: Array<{ bar: Bar; pattern: string; number: number }> = [];
  let n = 0;
  const numbers = new Map<string, number>();
  for (const s of song.sections) for (const b of s.bars) numbers.set(b.id, ++n);
  for (const id of ids) {
    const r = findBar(song, id);
    if (!r) continue;
    const s = song.sections[r.section]!;
    const bar = s.bars[r.bar]!;
    bars.push({ bar, pattern: barPatternId(s, bar), number: numbers.get(id)! });
  }
  if (bars.length === 0) return <aside className="inspector empty" />;

  const one = bars.length === 1 ? bars[0]!.bar : null;
  const first = bars[0]!;
  const last = bars[bars.length - 1]!;
  const sectionName = song.sections[findBar(song, first.bar.id)!.section]!.name;
  const samePattern = bars.every((b) => b.pattern === first.pattern) ? first.pattern : null;
  const noneOwn = bars.every((b) => !b.bar.rhythm);
  const sameOwn = first.bar.rhythm && bars.every((b) => b.bar.rhythm === first.bar.rhythm) ? first.bar.rhythm : null;

  return (
    <aside className="inspector">
      <h3>
        {one ? `Bar ${first.number}` : `Bars ${first.number}–${last.number}`}
        <span className="muted"> · {sectionName}</span>
      </h3>

      {one && (
        <>
          <button className="chords-field" onClick={a.openChords}>
            {props.chordsText || <span className="muted">—</span>}
          </button>
          <CueField label="Above" value={one.cueAbove ?? ""} focusKey={props.focusCue?.which === "above" ? props.focusCue.n : 0} onFocused={props.onCueFocused} onCommit={(v) => a.setCue("cueAbove", v)} />
          <CueField label="Below" value={one.cueBelow ?? ""} focusKey={props.focusCue?.which === "below" ? props.focusCue.n : 0} onFocused={props.onCueFocused} onCommit={(v) => a.setCue("cueBelow", v)} />
        </>
      )}

      <div className="rhythm-block">
        <div className="row">
          <span className="lbl">Rhythm</span>
          <div className="chips">
            {song.patterns.map((p) => (
              <Chip key={p.id} on={noneOwn && samePattern === p.id} onClick={() => a.setRhythm(p.id)}>{p.name}</Chip>
            ))}
            {sameOwn && <span className="chip on custom">Custom</span>}
          </div>
        </div>
        {props.steps && (
          <RhythmGrid steps={props.steps} counts={stepCounts(song.time)} beatSteps={beatTicks(song.time) / STEP_TICKS} onChange={a.setSteps} />
        )}
        {sameOwn && <SavePattern onSave={(name) => a.saveRhythm(name, sameOwn)} count={song.patterns.length} />}
      </div>

      <div className="row">
        <span className="lbl">Repeat</span>
        <div className="chips">
          {one ? (
            <>
              <Chip on={!!one.repeatStart} onClick={() => a.setRepeatStart(!one.repeatStart)} title="Start repeat">|:</Chip>
              <Chip on={!!one.repeatEnd} onClick={() => a.setRepeatEnd(!one.repeatEnd)} title="End repeat">:|</Chip>
            </>
          ) : (
            <Chip on={!!first.bar.repeatStart && !!last.bar.repeatEnd} onClick={() => a.setRepeat(!(first.bar.repeatStart && last.bar.repeatEnd))}>
              |: {first.number}–{last.number} :|
            </Chip>
          )}
          {last.bar.repeatEnd && (
            <span className="stepper">
              <button onClick={() => a.setRepeatTimes(last.bar.repeatEnd!.times - 1)} disabled={last.bar.repeatEnd.times <= 2}>−</button>
              <span>{last.bar.repeatEnd.times}×</span>
              <button onClick={() => a.setRepeatTimes(last.bar.repeatEnd!.times + 1)} disabled={last.bar.repeatEnd.times >= 16}>+</button>
            </span>
          )}
        </div>
      </div>

      <div className="row">
        <span className="lbl">Ending</span>
        <div className="chips">
          {[1, 2, 3, 4].map((k) => (
            <Chip key={k} on={bars.every((b) => b.bar.ending?.includes(k))} onClick={() => a.toggleEnding(k)}>{k}.</Chip>
          ))}
        </div>
      </div>

      {one && (
        <>
          <div className="row">
            <span className="lbl">Sign</span>
            <div className="chips">
              {MARKERS.map(([m, t]) => (
                <Chip key={m} on={one.marker === m} onClick={() => a.setMarker(one.marker === m ? undefined : m)}>{t}</Chip>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="lbl">Jump</span>
            <div className="chips">
              {JUMPS.map(([j, t]) => (
                <Chip key={j} on={one.jump === j} onClick={() => a.setJump(one.jump === j ? undefined : j)}>{t}</Chip>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="row">
        <span className="lbl">Bars</span>
        <div className="chips">
          <Chip onClick={() => a.insertBar(true)}>+ Before</Chip>
          <Chip onClick={() => a.insertBar(false)}>+ After</Chip>
          <Chip onClick={a.deleteBars}>Delete</Chip>
        </div>
      </div>
    </aside>
  );
}

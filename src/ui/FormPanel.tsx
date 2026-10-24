/**
 * The song's form: its sections in order, with their bar counts. This is §0's step 2, "lay out the
 * form", given a place of its own, as a song map is in MultiTracks' ChartBuilder. The first version
 * hid sections behind a selected bar. Clicking a section selects all its bars, so the inspector's
 * rhythm then applies to the whole section.
 */
import { useState, type ReactNode } from "react";
import type { Section, Song } from "../core/song";

export const SECTION_NAMES = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Solo", "Interlude", "Outro"];

export interface FormActions {
  select: (sectionId: string) => void;
  rename: (sectionId: string, name: string) => void;
  setBars: (sectionId: string, n: number) => void;
  move: (sectionId: string, by: -1 | 1) => void;
  duplicate: (sectionId: string) => void;
  remove: (sectionId: string) => void;
  add: (name: string) => void;
}

function Name({ section, onRename }: { section: Section; onRename: (n: string) => void }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null) {
    return (
      <button className="form-name" onDoubleClick={() => setV(section.name)} title="Double-click to rename">
        {section.name}
      </button>
    );
  }
  const done = () => {
    const n = v.trim().replace(/:$/, "");
    if (n && n !== section.name) onRename(n);
    setV(null);
  };
  return (
    <input
      className="form-name-input"
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") done();
        if (e.key === "Escape") setV(null);
      }}
      onBlur={done}
    />
  );
}

export function FormPanel({ song, active, a, bottom }: { song: Song; active: string | null; a: FormActions; bottom?: ReactNode }) {
  let bar = 1;
  return (
    <nav className="form-panel">
      <h3>Form</h3>
      <ol className="form-list">
        {song.sections.map((s, i) => {
          const first = bar;
          bar += s.bars.length;
          return (
            <li key={s.id} className={s.id === active ? "on" : ""} onClick={() => a.select(s.id)}>
              <span className="form-bar">{first}</span>
              <Name section={s} onRename={(n) => a.rename(s.id, n)} />
              <span className="form-count" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => a.setBars(s.id, s.bars.length - 1)} disabled={s.bars.length <= 1} title="Remove last bar">−</button>
                <span>{s.bars.length}</span>
                <button onClick={() => a.setBars(s.id, s.bars.length + 1)} title="Add a bar">+</button>
              </span>
              <span className="form-tools" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => a.move(s.id, -1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => a.move(s.id, 1)} disabled={i === song.sections.length - 1} title="Move down">↓</button>
                <button onClick={() => a.duplicate(s.id)} title="Duplicate">⧉</button>
                {song.sections.length > 1 && <button onClick={() => a.remove(s.id)} title="Delete">×</button>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="form-add">
        {SECTION_NAMES.map((n) => (
          <button key={n} className="chip" onClick={() => a.add(n)}>+ {n}</button>
        ))}
      </div>
      {bottom}
    </nav>
  );
}

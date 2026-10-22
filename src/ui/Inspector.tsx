/**
 * The selected bar and its section. Labels and values only (§7.1). A control that cannot act in the
 * current state is not drawn (§7.2): the repeat count appears only on a closing repeat.
 */
import type { Jump, Marker, Section, Song } from "../core/song";
import { barPatternId, findBar } from "../core/song";

export const SECTION_NAMES = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Solo", "Interlude", "Outro"];

const MARKERS: Array<[Marker, string]> = [["segno", "Segno"], ["coda", "Coda"]];
const JUMPS: Array<[Jump, string]> = [
  ["toCoda", "To Coda"],
  ["dsAlCoda", "D.S. al Coda"],
  ["dcAlCoda", "D.C. al Coda"],
  ["dcAlFine", "D.C. al Fine"],
  ["fine", "Fine"],
];

export interface InspectorActions {
  setBarPattern: (id: string | undefined) => void;
  setSectionPattern: (id: string) => void;
  toggleRepeatStart: () => void;
  toggleRepeatEnd: () => void;
  setRepeatTimes: (n: number) => void;
  toggleEnding: (n: number) => void;
  setMarker: (m: Marker | undefined) => void;
  setJump: (j: Jump | undefined) => void;
  insertBar: (before: boolean) => void;
  deleteBar: () => void;
  renameSection: () => void;
  moveSection: (by: -1 | 1) => void;
  duplicateSection: () => void;
  deleteSection: () => void;
  addSection: (name: string) => void;
}

function Chip(props: { on?: boolean; onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean }) {
  return (
    <button className={props.on ? "chip on" : "chip"} onClick={props.onClick} title={props.title} disabled={props.disabled}>
      {props.children}
    </button>
  );
}

export function Inspector({ song, barId, a }: { song: Song; barId: string | null; a: InspectorActions }) {
  const ref = barId ? findBar(song, barId) : null;
  const section: Section | undefined = ref ? song.sections[ref.section] : undefined;
  const bar = ref && section ? section.bars[ref.bar] : undefined;
  const number = ref ? song.sections.slice(0, ref.section).reduce((n, s) => n + s.bars.length, 0) + ref.bar + 1 : 0;

  if (!bar || !section || !ref) {
    return (
      <aside className="inspector">
        <div className="group">
          <h3>Add section</h3>
          <div className="chips">
            {SECTION_NAMES.map((n) => <Chip key={n} onClick={() => a.addSection(n)}>{n}</Chip>)}
          </div>
        </div>
      </aside>
    );
  }

  const current = barPatternId(section, bar);
  return (
    <aside className="inspector">
      <div className="group">
        <h3>Bar {number}</h3>
        <div className="row">
          <span className="lbl">Rhythm</span>
          <div className="chips">
            {song.patterns.map((p) => (
              <Chip key={p.id} on={current === p.id} onClick={() => a.setBarPattern(p.id === section.pattern ? undefined : p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Repeat</span>
          <div className="chips">
            <Chip on={!!bar.repeatStart} onClick={a.toggleRepeatStart} title="Start repeat">|:</Chip>
            <Chip on={!!bar.repeatEnd} onClick={a.toggleRepeatEnd} title="End repeat">:|</Chip>
            {bar.repeatEnd && (
              <span className="stepper">
                <button onClick={() => a.setRepeatTimes(bar.repeatEnd!.times - 1)} disabled={bar.repeatEnd.times <= 2}>−</button>
                <span>{bar.repeatEnd.times}×</span>
                <button onClick={() => a.setRepeatTimes(bar.repeatEnd!.times + 1)} disabled={bar.repeatEnd.times >= 16}>+</button>
              </span>
            )}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Ending</span>
          <div className="chips">
            {[1, 2, 3, 4].map((n) => (
              <Chip key={n} on={bar.ending?.includes(n)} onClick={() => a.toggleEnding(n)}>{n}.</Chip>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Sign</span>
          <div className="chips">
            {MARKERS.map(([m, t]) => (
              <Chip key={m} on={bar.marker === m} onClick={() => a.setMarker(bar.marker === m ? undefined : m)}>{t}</Chip>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Jump</span>
          <div className="chips">
            {JUMPS.map(([j, t]) => (
              <Chip key={j} on={bar.jump === j} onClick={() => a.setJump(bar.jump === j ? undefined : j)}>{t}</Chip>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Bar</span>
          <div className="chips">
            <Chip onClick={() => a.insertBar(true)}>+ Before</Chip>
            <Chip onClick={() => a.insertBar(false)}>+ After</Chip>
            {section.bars.length > 1 && <Chip onClick={a.deleteBar}>Delete</Chip>}
          </div>
        </div>
      </div>

      <div className="group">
        <h3>
          <button className="link" onClick={a.renameSection}>{section.name}</button>
          <span className="muted"> · {section.bars.length} bars</span>
        </h3>
        <div className="row">
          <span className="lbl">Rhythm</span>
          <div className="chips">
            {song.patterns.map((p) => (
              <Chip key={p.id} on={section.pattern === p.id} onClick={() => a.setSectionPattern(p.id)}>{p.name}</Chip>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Section</span>
          <div className="chips">
            <Chip onClick={() => a.moveSection(-1)} disabled={ref.section === 0}>↑</Chip>
            <Chip onClick={() => a.moveSection(1)} disabled={ref.section === song.sections.length - 1}>↓</Chip>
            <Chip onClick={a.duplicateSection}>Duplicate</Chip>
            {song.sections.length > 1 && <Chip onClick={a.deleteSection}>Delete</Chip>}
          </div>
        </div>
      </div>

      <div className="group">
        <h3>Add section</h3>
        <div className="chips">
          {SECTION_NAMES.map((n) => <Chip key={n} onClick={() => a.addSection(n)}>{n}</Chip>)}
        </div>
      </div>
    </aside>
  );
}

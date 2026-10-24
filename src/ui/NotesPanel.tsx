/**
 * Written notes (decision 8): *"I think we can add a feature to add notes as well, bottom of left
 * sidebar is empty, so we can add there"*. He then answered "Musical notes".
 *
 * The palette shows what the keyboard does, and every button has its key in its tooltip, so the
 * palette teaches the keys. Digits set the length, letters A–G write a note at the cursor, Shift adds
 * to the chord, ↑/↓ moves a semitone, ⌘↑/⌘↓ an octave, 0 writes a rest, `.` dots, T ties and ⌫ takes
 * the last note back. The keys are MuseScore's, except the digits, which follow the palette's order
 * (`docs/research/chart-apps.md`).
 */
import { MUSIC_FONT } from "./engrave/metrics";

export interface NoteInputState {
  barId: string;
  /** Cursor, in ticks from the bar's start. */
  cursor: number;
  /** 1 whole … 5 sixteenth. */
  value: 1 | 2 | 3 | 4 | 5;
  dotted: boolean;
}

export function valueTicks(v: NoteInputState["value"], dotted: boolean): number {
  const t = 3840 / 2 ** (v - 1);
  return dotted && v < 5 ? t * 1.5 : t;
}

/** Leland's metronome notes, so the palette shows the values as they look on the page. */
const VALUE_GLYPH: Record<number, string> = { 1: "", 2: "", 3: "", 4: "", 5: "" };
const VALUE_NAME: Record<number, string> = { 1: "Whole", 2: "Half", 3: "Quarter", 4: "8th", 5: "16th" };

export interface NotesActions {
  setMode: (notes: boolean) => void;
  setValue: (v: NoteInputState["value"]) => void;
  toggleDot: () => void;
  rest: () => void;
  tie: () => void;
  accidental: (acc: -1 | 0 | 1) => void;
  octave: (dir: 1 | -1) => void;
  undoNote: () => void;
  stop: () => void;
}

export function NotesPanel(props: { isNotes: boolean; input: NoteInputState | null; a: NotesActions }) {
  const { input, a } = props;
  return (
    <div className="notes-panel">
      <h3>Bar</h3>
      <div className="seg">
        <button className={!props.isNotes ? "on" : ""} onClick={() => a.setMode(false)}>Slashes</button>
        <button className={props.isNotes ? "on" : ""} onClick={() => a.setMode(true)}>Notes</button>
      </div>
      {props.isNotes && (
        <>
          <div className="note-values">
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <button
                key={v}
                className={input?.value === v ? "nv on" : "nv"}
                title={`${VALUE_NAME[v]} (${v})`}
                onClick={() => a.setValue(v)}
              >
                <span style={{ fontFamily: MUSIC_FONT }}>{VALUE_GLYPH[v]}</span>
              </button>
            ))}
            <button className={input?.dotted ? "nv on" : "nv"} title="Dot (.)" onClick={a.toggleDot}>
              <span className="dot">•</span>
            </button>
          </div>
          <div className="note-tools">
            <button className="nv" title="Rest (0)" onClick={a.rest}><span style={{ fontFamily: MUSIC_FONT }}>{""}</span></button>
            <button className="nv" title="Tie to next (T)" onClick={a.tie}>‿</button>
            <button className="nv" title="Flat" onClick={() => a.accidental(-1)}>♭</button>
            <button className="nv" title="Natural" onClick={() => a.accidental(0)}>♮</button>
            <button className="nv" title="Sharp" onClick={() => a.accidental(1)}>♯</button>
            <button className="nv" title="Octave up (⌘↑)" onClick={() => a.octave(1)}>8va</button>
            <button className="nv" title="Octave down (⌘↓)" onClick={() => a.octave(-1)}>8vb</button>
            <button className="nv" title="Take back last note (⌫)" onClick={a.undoNote}>⌫</button>
          </div>
          {input && (
            <button className="chip done" onClick={a.stop} title="Esc">
              Done
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * What is in force at each bar: key, meter, tempo (decision 7: *"what about key changes etc?? We
 * should cover all harmonic posibilities"*).
 *
 * A key change is stored as a degree above the song's key, like a chord. Transposing the song then
 * moves every change with it, and a last chorus "up a step" stays up a step in any key. Chords and
 * written notes in a bar are stored relative to the key in force *there*. A copied chorus pasted
 * after a modulation therefore comes out in the new key, which is what a band means by "same
 * chorus, up a step".
 *
 * Pitch here carries octaves, for written notes (decision 8): the song's tonic sits at
 * `song.tonicOctave` (default 4), as a diatonic step `octave * 7 + letter` and as MIDI.
 */
import { fromDegree, type Degree } from "./chord";
import { mod, naturalPc, pcOf, sameKey, writableKey, type Key, type Mode } from "./pitch";
import type { Song } from "./song";
import type { TimeSig } from "./ticks";

export interface KeyChange {
  degree: Degree;
  mode: Mode;
}

export interface BarContext {
  key: Key;
  time: TimeSig;
  tempo: number;
  /** Absolute diatonic step of this key's tonic: octave * 7 + letter. */
  tonicStep: number;
  tonicMidi: number;
  /** A key change takes effect at this bar (and it differs from the key before). */
  keyChanged: boolean;
  timeChanged: boolean;
  tempoChanged: boolean;
  /** The key in force before this bar, for cancelling naturals. */
  prevKey: Key;
  prevTime: TimeSig;
}

export const DEFAULT_TONIC_OCTAVE = 4;

export function midiOf(letter: number, acc: number, octave: number): number {
  return 12 * (octave + 1) + naturalPc(letter) + acc;
}

export function songTonic(song: Song): { step: number; midi: number } {
  const oct = song.tonicOctave ?? DEFAULT_TONIC_OCTAVE;
  return { step: oct * 7 + song.key.tonic.letter, midi: midiOf(song.key.tonic.letter, song.key.tonic.acc, oct) };
}

/** The key a change produces, and where its tonic sits, respelled if it would be unwritable. */
export function changedKey(song: Song, change: KeyChange): { key: Key; step: number; midi: number } {
  const home = songTonic(song);
  const raw: Key = { tonic: fromDegree(change.degree, song.key), mode: change.mode };
  const key = writableKey(raw);
  // A respelling moves the letter by one, either way. The step follows the letter, and the MIDI does
  // not move.
  const letterShift = mod(key.tonic.letter - raw.tonic.letter + 3, 7) - 3;
  return { key, step: home.step + change.degree.steps + letterShift, midi: home.midi + change.degree.semis };
}

/** Every bar's context, in reading order. */
export function barContexts(song: Song): Map<string, BarContext> {
  const out = new Map<string, BarContext>();
  const home = songTonic(song);
  let key = song.key;
  let step = home.step;
  let midi = home.midi;
  let time = song.time;
  let tempo = song.tempo;
  for (const s of song.sections)
    for (const b of s.bars) {
      const prevKey = key;
      const prevTime = time;
      let keyChanged = false;
      let timeChanged = false;
      let tempoChanged = false;
      if (b.keyChange) {
        const k = changedKey(song, b.keyChange);
        keyChanged = !sameKey(k.key, key);
        ({ key, step, midi } = k);
      }
      if (b.timeChange) {
        timeChanged = b.timeChange.beats !== time.beats || b.timeChange.unit !== time.unit;
        time = b.timeChange;
      }
      if (b.tempoChange !== undefined) {
        tempoChanged = b.tempoChange !== tempo;
        tempo = b.tempoChange;
      }
      out.set(b.id, { key, time, tempo, tonicStep: step, tonicMidi: midi, keyChanged, timeChanged, tempoChanged, prevKey, prevTime });
    }
  return out;
}

/** The degree and mode that make `to` from the song's key: what a key change stores. */
export function keyChangeTo(song: Song, to: Key): KeyChange {
  return keyChangeBetween(song.key, to);
}

export function keyChangeBetween(home: Key, to: Key): KeyChange {
  return {
    degree: { steps: mod(to.tonic.letter - home.tonic.letter, 7), semis: mod(pcOf(to.tonic) - pcOf(home.tonic), 12) },
    mode: to.mode,
  };
}

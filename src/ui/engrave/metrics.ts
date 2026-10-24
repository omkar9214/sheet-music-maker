/**
 * Page geometry, in PostScript points, measured off a 400-dpi render of his MuseScore PDF
 * (`docs/reference/Khwabon ke Parindey.pdf`, decision 2). "It should look exactly like a traditional
 * chart" is a claim about that file, so the numbers come from it. Where a number is not measured, it
 * says so.
 */

/** US Letter, from `pdfinfo`: 612 × 792 pt. */
export const PAGE_W = 612;
export const PAGE_H = 792;

/** Staff lines measured 4.98 pt apart. MuseScore's default spatium is 1.75 mm = 4.96 pt. */
export const SP = 4.96;
export const STAFF_H = 4 * SP;

/** The staff runs from 42.5 to 569.3, which is a 15 mm margin both sides. */
export const MARGIN_X = 42.5;
export const CONTENT_W = PAGE_W - 2 * MARGIN_X;
/**
 * No first-system indent (decision 16: "Remove the first-line indent so every line is the same
 * length"). His PDF has MuseScore's 5 sp (24.8 pt, the staff at 67.3), and that is what this was
 * until 2026-10-24.
 */
export const FIRST_INDENT = 0;

export const MARGIN_TOP = 42.5;
export const MARGIN_BOTTOM = 42.5;
/** Page 1: title band 42.5–63, source 84.6–91.8, first label at 126.9. */
export const TITLE_BASELINE = 58;
export const SOURCE_BASELINE = 91.8;
export const PAGE1_CONTENT_TOP = 112;
/** Pages 2+: the page number is at 42.5–50, and the first label is at 55.3. */
export const PAGE_NUMBER_BASELINE = 50;
export const PAGEN_CONTENT_TOP = 54;

/** SMuFL: one em is four staff spaces. Leland is MuseScore 4's music font. */
export const MUSIC_FONT = "Leland";
export const MUSIC_SIZE = 4 * SP;
/** Edwin is MuseScore 4's text font. The PDF's text is Edwin. */
export const TEXT_FONT = "Edwin";

/**
 * Text sizes. Calibrated against the PDF's ink widths: "Bmaj7" is 29.2 pt wide, "Vocal 1 Enters"
 * boxed is 73.5 pt, "Intro:" is 35.1 pt, and the title is 223.9 pt.
 */
export const SIZE = {
  title: 22,
  source: 10,
  label: 14,
  tempo: 10,
  chord: 11,
  cue: 10,
  barNumber: 8,
  pageNumber: 10,
  count: 11,
} as const;

/** Leland engraving defaults (metadata.json), in staff spaces. */
export const LINE = {
  staff: 0.11 * SP,
  stem: 0.1 * SP,
  beam: 0.5 * SP,
  beamGap: 0.25 * SP,
  thin: 0.18 * SP,
  thick: 0.55 * SP,
  barlineSep: 0.37 * SP,
  volta: 0.11 * SP,
  enclosure: 0.16 * SP,
} as const;

/** Vertical stacking above the staff top, measured: chord band top is 20.3 pt above the staff, and
 * the boxed cue's bottom is 21.6 pt above it, its top 33.4. */
export const CHORD_BASELINE = 12.4;
export const CHORD_ROW = 22;
export const VOLTA_ROW = 14;
export const BOX_H = 15;
export const BOX_ROW = 17;
export const BOX_PAD_X = 3.5;
export const TEMPO_EXTRA = 8;
/**
 * The tempo mark's left edge, from the staff's start. It was 1.8 sp (MuseScore's, over the clef of an
 * indented first system). With no indent (decision 16) that left it 9 pt right of the section label
 * at the margin: two left edges a hair apart. So the label, the tempo and the staff now share one
 * edge (decision 16's addendum: "adjust accordingly to the text above, so it makes sense").
 */
export const TEMPO_X = 0;
/** A tempo mark lifted clear of the first chord: one chord row's text height plus a gap. */
export const TEMPO_RAISE = 13;
export const LABEL_GAP = 3;
/** Below: "Acoustic Guitar only" sits on a baseline 15.5 pt under the staff's bottom line. */
export const BELOW_BASELINE = 15.5;
export const BELOW_ROW = 13;
/** The treble-8vb clef's "8" reaches 6 pt under the staff. */
export const BELOW_MIN = 8;
/** Not measured: MuseScore spreads systems to fill the page. A fixed gap is a choice, inference. */
export const SYSTEM_GAP = 16;

/** Unicode for the SMuFL glyphs used. Leland lacks the slash noteheads (U+E100–E10F), so slashes
 * are drawn as paths. */
export const GLYPH = {
  gClef: "",
  gClef8vb: "",
  fClef: "",
  sharp: "",
  flat: "",
  natural: "\uE261",
  doubleSharp: "\uE263",
  doubleFlat: "\uE264",
  noteWhole: "\uE0A2",
  noteHalf: "\uE0A3",
  noteBlack: "\uE0A4",
  flag8thUp: "\uE240",
  flag16thUp: "\uE242",
  flag32ndUp: "\uE244",
  timeSig: (d: number) => String.fromCodePoint(0xe080 + d),
  restWhole: "",
  restHalf: "",
  restQuarter: "",
  rest8th: "",
  rest16th: "",
  rest32nd: "",
  flag8thDown: "",
  flag16thDown: "",
  flag32ndDown: "",
  dot: "",
  repeatDot: "",
  segno: "",
  coda: "",
  metQuarter: "",
  metDot: "",
} as const;

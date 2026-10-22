# Working agreement

**Every agent reads this file first, in full.** `CLAUDE.md` in this folder is a pointer to it, so
there is exactly one set of rules and it cannot drift between agents.

Omkar owns the product. No agent changes a decision he has made; we record it and build to it.

**This repo was set up on 2026-10-22** — `WORKLOG.md` decision 1. No code came across from the
guitar apps; **their rules did.** §1–§4, §7 and §9 are the Guitar Technique Trainer's (itself the
Interval trainer's and the chord-tone trainer's before it), carried word for word, because they were
paid for in real defects and a rule reworded loses the evidence that makes it stick. Where one of
them names a guitar-app file or exercise, that is the evidence, not a claim about this repo. §0, §5
and §6 are about *this* product, and §0 is written (decisions 2–3).

---

## 0. The brief

**Written 2026-10-22 from Omkar's brief, `WORKLOG.md` decision 2.** **[R]** marks his ruling, and
**[I]** marks inference he has not confirmed yet. The reference artifact is his MuseScore chart
*Khwabon ke Parindey* (3 pages, 73 bars), and a copy lives at `docs/reference/`. **"It should look
exactly like a traditional chart"** means it should look like that PDF.

1. **Who and what for.** A band chart: the song's structure, its cues, its chords and its key
   information **[R]**, written by Omkar for the musicians playing it **[I]**. It is fast: **a whole
   sheet in about 10 minutes [R]**. MuseScore was "very complicated … very sluggish and slow" for
   this job **[R]**.
2. **What goes in.**
   - Chords come from a menu, or something more elegant. The design is left to us **[R]**.
     **Typed with a palette [R, decision 3]**: type `c#m11`, or click from the key's diatonic
     chords, the qualities and the chords used recently.
   - Cues are many, so the way to write them has to be elegant **[R]**. They go in text boxes that
     are already there wherever there is space **[R]**.
   - Rhythm is notated, but not note by note **[R]**: it is slash rhythm, as in the reference.
     **Pattern stamps [R, decision 3]**: a few named patterns per song, one set per section,
     overridden per bar.
   - Individual notes may come "on the second pass" **[R]**, and that is not MVP.
3. **What comes out.** A traditional chart drawn on screen **[R]**:
   - title and source line, tempo, time signature, key signature
   - section labels and bar numbers
   - boxed cues above the staff and plain cues below it
   - chord symbols and slash rhythm
   - repeat signs, 1st–4th endings, coda, and "N×" counts **[R]**

   **Print/PDF [R, decision 3]**. No MusicXML. Playback is not asked for, so there is none
   **[I]**.
4. **Instrument.** The reference is guitar, treble clef 8vb. **Transposition is the core reason
   chords are picked rather than typed [R]**: change the key from F♯ to A and *everything* moves
   to A **[R]**. The reference itself is in B major (5 sharps).
5. **The loop.**

   ```
   1. start a sheet: title, source, key, tempo, time signature      [R key/tempo; I the rest]
   2. lay out the form: sections (Intro, Chorus, Verse 1 …), bars each  [R structure]
   3. put chords in bars, from the menu                               [R]
   4. set each bar's rhythm: a strum pattern, slashes, a choke        [R rhythm notated; I how]
   5. write cues into the boxes                                       [R]
   6. mark repeats, endings, coda, N×                                 [R]
   7. (any time) change key → whole chart transposes                  [R]
   8. print / PDF it for the band                                     [R]
   ```

6. **Ruling vs inference.** Marked inline above.
7. **Where it ships.** **Standalone, this repo [R, decision 3].** It can be vendored into
   learnMusicIn later.

**If a feature does not shorten a numbered step, it is not MVP.**

---

## 1. Ask when intent or scope is unclear

If a request is ambiguous, or an action needs a material assumption, ask before acting. This
includes which surface he means, whether a dependency or integration is in scope, and what a
control should do at its edges.

When a feature request is clear, take the in-scope actions needed to implement it. If it does not
make sense as stated, requirements conflict, or a detail is missing, **pause and ask the focused
question** rather than choosing a design on his behalf.

**Ask with a recommendation, not a survey.** He answers fast and picks the recommendation most of
the time; three options with a marked default costs him five seconds, an open question costs him a
paragraph.

**And ask at the right time.** Do everything that does not depend on the answer first. Blocking
with nothing delivered is for the case where proceeding under any assumption would be unsafe or
would make the work useless if wrong.

**He numbers exercises by rail row.** In the Interval trainer he renumbered three times, and every
**Take his names for things as what is on screen now, never as internal ids.** In the Interval
trainer he renumbered exercises three times, and every time "exercise 6" meant a different screen
from the one the code called `exercise6`. Keep ids semantic so the two can never drift.

---

## 2. The four files that carry state

| File | Rule | Purpose |
|---|---|---|
| `AGENTS.md` | Edited only by Omkar, or by an agent he asks | The rules. This file. |
| `WORKLOG.md` | **Append only. Never rewrite or delete.** | The past — what happened, with timestamps. |
| `NEXT.md` | Live queue. Meant to be edited. | The future — what is to be done, in order. |
| `docs/**` | Amend, never silently reverse | What was agreed and what is known. |

`WORKLOG.md` and `NEXT.md` are the baton. Read both at the start of a session, leave both accurate
at the end. Between them, no session should ever have to guess what the last one was doing or why.

If something in the worklog turns out to be wrong, **add a correction entry**. Do not edit the
original. A visible mistake is worth more than a tidy file.

### 2.1 Every instruction from Omkar gets a `decision` entry — no exceptions

This failed once in the source project, and it is worth stating why the rule is shaped the way it
is: six separate rulings were recorded verbatim but *inside* `work` entries. The pickup routine
greps for `Type:** decision`, so from the other side of the baton those rulings did not exist, and
the next session would have rebuilt against defaults nobody knew were overruled.

> **If Omkar said it, it goes in a `decision` entry, quoted verbatim, in the same session he said
> it.** Not paraphrased, not summarised into the work entry that implements it, not "captured by
> the code".

A `work` entry may *also* quote him — that is useful context. It does not count. One `decision`
entry per session collecting that session's rulings is fine; zero is a defect whenever he gave an
instruction.

**Three things that must be in the entry and are easy to leave out:**

- **What you inferred, marked as inference.** If he says "make it less wide" and you decide that
  means string spacing rather than the rendered box, the entry records his words *and* your reading
  *and* that he has not confirmed it.
- **Anything he supplied but did not explain.** A file, a folder, a screenshot, a link. Record that
  it arrived and that its purpose is unstated. Never guess a purpose into code.
- **The measurement, when the instruction is a bug report.** His reports are terse — *"this x is not
  working"* — and the entry is where the reproduction goes, in numbers, before any fix. Half the
  reports in the source project turned out to be a different defect from the one the words
  described.

Check before you finish:

```bash
grep -c 'Type:\*\* decision' WORKLOG.md
```

If Omkar spoke this session and that number did not go up, you are not finished.

### 2.2 Entry format

```markdown
## <YYYY-MM-DD> — <agent> — decision <n>: <one line>

**Type:** decision
**Files:** <paths, or "none — recorded before any code moved">
**Did:** Omkar, verbatim:

> *"<exactly what he wrote, typos included>"*

**Inference, marked as inference:** <what you decided that he did not say>

**Why:** His instruction.

**Open:** <what he has not ruled on>
```

```markdown
## <YYYY-MM-DD> — <agent> — work: <one line>

**Type:** work
**Files:** <paths>
**Did:** <what changed, and the reasoning that is not obvious from the diff>

**Verified:** <command + result, and what was driven in the browser>

**Open:** <what is unfinished or unconfirmed>
```

**No `work` entry may claim done without a verification line quoting the command and its result.**
"Tests pass" is not a verification line. `EXIT=0 — 60 tests in 5 files` is.

---

## 3. Branches, and one agent at a time

If more than one agent works on this project, they work **one after the other, never together**.
That is what makes the arrangement safe: no concurrent writing, so nothing to lock.

The asymmetry that worked in practice:

| Agent | Where | Merging |
|---|---|---|
| The one that owns the repo (Claude) | the main branch, directly | n/a |
| The other (Codex) | a fresh `task/<slug>` branch, cut at the start of **every** session | only when Omkar explicitly asks — and the branch is **deleted in the same step** |

### 3.1 A task branch does not update itself

Git never moves a branch for you. A `task/<slug>` branch holds the commit it was left at; every
commit on main afterwards is invisible to it until someone merges or rebases. Nothing warns you.
The branch keeps building, testing and passing against a main that no longer exists. In the source
project one branch reached **31 commits behind and 20 ahead** before anyone noticed.

So a session on a task branch starts by catching up:

```bash
git fetch origin
git switch task/<slug>
git log --oneline task/<slug>..origin/main   # what you missed. Read it.
git merge origin/main
```

A conflict here is a design question, not a text-editing one. Stop and ask.

**The actual fix is short-lived branches.** Cut from current main, finish the one task, merge it,
delete it. Divergence is a function of time. Reusing a merged branch for the next task is what
produces the situation above.

**Merged means deleted, both ends, same breath.** A merged branch left in place is exactly what the
next session opens and continues from.

**Why documentation alone cannot fix this:** a stale branch's copy of *this section* is the version
from before the warning was written. A rule that lives in the repo cannot warn you that you are
behind the repo. Only starting somewhere new escapes it.

### 3.2 Two agents need two working directories

Pointing two agents at one directory destroyed uncommitted work twice in one day. The fix is a
second directory, not a second repository:

```bash
git worktree add <path>/main-wt main
```

Same `.git`, same history, same remote. Only the checked-out files are separate, which is the thing
that was colliding. Never run `git switch` in the other agent's directory.

---

## 4. When you finish

1. `npm run check` must pass.
2. Append a `work` entry to `WORKLOG.md` with a verification line.
3. **If Omkar gave any instruction this session, append a `decision` entry too** — §2.1.
4. Commit. There is no remote yet; pushing is Omkar's call, every time.

```bash
npm run check
grep -c 'Type:\*\* decision' WORKLOG.md   # must have risen if he spoke
git add -A && git commit -m "<what changed>"
```

Small, frequent commits. One logical change per commit, so a bad change can be reverted without
taking good work with it. Never `git reset --hard`, never `git push --force`.

---


## 5. Non-negotiables

Breaking one is a build failure, not a style preference. **Keep the numbering when you delete or
amend one** — code comments refer to these by number. Amend in place: say what the line used to say,
what changed it and when, so a comment written against the old wording can still be read.

**Set at scaffold by Claude, by inference — Omkar has ruled on none of these.** They are the
invariants any notation app needs whatever §0 turns out to say. Each is his to overrule, with a
decision entry and an amendment here.

1. **Durations are exact.** Integer ticks (or rationals), never floating-point seconds or beats. A
   dotted note, a triplet and a quintuplet inside a beat must sum to that beat exactly, with no
   epsilon. Every bar's contents sum to its time signature, **checked before it is drawn, played or
   exported** — an overfull or underfull bar is rejected or completed with rests, never drawn and
   coloured red. (The chord-tone trainer's 960-PPQ tick model is the reference:
   `guitar-app-template/starter/core/ticks.ts`.)
2. **Pitch is spelled, not just numbered.** A note is letter + accidental + octave; MIDI is derived
   from it, never the other way round. F♯ and G♭ are different notes on a page, and no edit, import,
   transposition or export may silently respell one as the other.
3. **The score is data; every view is compiled from it.** Staff, tab, playback, PDF and any export
   are renderings of one model. No view stores musical truth, and no edit is made to a rendering.
4. **Never lose the user's work.** Every edit is saved as it is made, and every edit can be undone. A
   crash, a reload or a closed tab costs nothing. (Song Structure's rule: *"it must never lose a
   song."*)
5. **What is exported imports back identical.** For every format the app writes and reads, a
   round-trip test on real scores, not only a fixture (§9.10).
6. **Nothing invented silently.** Every engraving rule (beaming, stem direction, spacing, accidental
   carrying) cites its source — Elaine Gould, *Behind Bars*, is the default authority — or says
   plainly that it is inference.
7. **The page is not squeezed.** Notation is never scaled below legibility to make it fit; if the
   space is too small, the page scrolls. (The guitar apps' board rule, §6 there: three features
   each quietly stole height until the neck was clipped, and every one passed its tests.)

---

## 6. Where it runs

**Vite + React + TypeScript, no backend, no Next.js** — the guitar apps' standing rule, for the same
reason: until §0 says the sheets are shared or stored online, there is nothing to store on a server
and nobody to log in. Saving is local (§5.4). What would change it is shipping inside `learnMusicIn`
(Next.js + Supabase) — that is a vendoring decision, made as the chord-tone trainer's was, not a
rewrite. See `../CLAUDE.md`, "The vendor seam".

Ports: **5193** for his use, **5194** for agents (`technique-trainer` taught that driving the app on
his port overwrites his own saved data). `.claude/launch.json` has both.

**No notation library is used, by choice, since 2026-10-22 (WORKLOG work entry after decision 3).**
It used to say none was chosen yet and that the choice would follow §0. §0 turned out narrow:
slashes, chord symbols, cues, repeats. A library would bring a note model this app does not have,
so the engraver is our own SVG (`src/ui/engrave/`). Its glyphs are **Leland** and its text is
**Edwin**, MuseScore 4's own fonts (OFL, `@vexflow-fonts/*`), because his reference PDF is set in
them. Revisit when note entry (§0, "second pass") arrives.

## 7. Style

### 7.1 Answer short. He did not ask for an essay.

**Omkar, verbatim:** *"I don't understand why you have wrritten so much text, who asked you, update
md file so you don't do this again."*

This governs **what you write back to him** and it also governs **UI copy**. He pointed at both in
the same breath: a chat summary with nine paragraphs, and three explanatory sentences printed in the
app that nobody asked for.

- **Lead with the finding in one sentence** and then stop. If the work is done and it passes, that
  is one line, not a section.
- **No section headings, no bold labels, no bullet list of everything you touched.** He can read the
  diff. A list is for a set of *decisions he has to make*, not for narrating work.
- **Do not explain your reasoning unless he asked.** The reasoning belongs in the code comment and
  in `WORKLOG.md`.
- **Do not restate his instruction back to him.**
- **UI copy: never write a sentence explaining where a control is or what a mode is for.** If a
  control needs a paragraph, the control is wrong. Labels and values only.

**This does not relax `WORKLOG.md` or code comments.** §2.1 requires the worklog to be exact and
verbatim, and the comments are where the next session learns why. Brevity is for the terminal and
the screen, not for the record.

### 7.2 A mode that narrows must narrow everything downstream of it

**Omkar, verbatim:** *"This is not really simple or helpful, when we are working on one thing at a
time (you should have thought of this yourself, update md file)."*

He was looking at a preset armed on **Dorian** whose left rail then offered
`Scale → Dorian → Level 1 → …` — a tree asking him to pick a choice the preset had already made.

> **When a mode fixes a choice, every surface downstream stops offering that choice, and every
> control that only makes sense for the choices the mode removed stops being drawn.**

Not greyed. **Not drawn.** Greying is for a control that will become available again in this same
context; a control that cannot apply here is noise with a border round it.

The checklist, whenever a mode, preset or filter is added:

- What has this fixed? Where else is that still offered?
- Which controls now act on nothing? Delete them from this context.
- What does this screen still need that the removed controls used to supply? Supply it directly.

**How to tell a dead control from a live one: trace the state it writes.** In the source project a
whole key-picker column stayed on screen inside a preset because nobody checked that the function
reading it returned early before ever looking. Every press wrote state nothing consumed. That is not
a judgement call, it is a measurement.


### 7.3 Code style

Match the surrounding code. Strict TypeScript, no `any`. Keep musical logic out of React, SVG and
CSS. Import subsystems through their entry points.

**Comments carry the ruling and the measurement, not a description of the code.** A comment that
says what the line does is noise; one that says *which of his instructions this line answers, and
what happened when it was written the other way* is the only durable record. Every non-obvious
constant in this codebase says why it is that number.

### 7.4 Corrections

Correct an earlier statement only when the error changes his code, conclusions or decisions. State
it plainly and continue. No apologies, no tallying past mistakes, no detailed account. For slips
that change nothing, fix it and move on.

**But do correct the record.** If a worklog entry claimed something that turned out false, the next
entry says so in as many words — append, never edit.

---


---

## 8. Shared skills

Every agent uses the **same** skills, one copy each in `skills/`. Neither has a private version, so
neither can drift.

| Skill | Use it when |
|---|---|
| `skills/session-start/SKILL.md` | Beginning any session, before touching anything |
| `skills/session-end/SKILL.md` | Finishing a session, before you stop |
| `skills/verify-repo/` | Run by `npm run check`; the rules here a machine can check |
| `skills/user-scenarios/` | Before designing anything the user touches, and before reporting it done |

`session-start` and `session-end` are not optional politeness. They are how the baton gets passed.

**Omkar, verbatim (Technique Trainer, decision 59):** *"You ask me only when something drastic needs
to be done. and always verify your work using screenshots."* Every user-visible change is
screenshotted in the browser pane before it is reported, and its claims measured in the live DOM.

---

## 9. How to build here

Every rule below earned its place by catching a real defect **in the Interval trainer, the
chord-tone trainer and the Technique Trainer**. The evidence is attached because the evidence is the
argument — a rule you cannot see the cost of is a rule you will talk yourself out of at the wrong
moment. Carried over word for word; read "player" as "user" and "exercise" as "feature".

### 9.1 Measure the artifact, not the intention

The code being correct is not evidence that the thing works. Measure the object the player actually
hears or sees.

- Samples were scheduled perfectly and still sounded uneven, because the attack sat in a different
  place *inside each file*.
- Two samples were the wrong note entirely. Every line of code that placed them was correct.
- The board was clipped by 141px by a change that typechecked, tested and looked fine in a
  downscaled screenshot.

**Screenshots come back downscaled and will not show you a 3px overflow or a colour one token off.
Measure the live DOM.**

### 9.2 Validate the instrument before you trust its verdicts

A measurement you have not checked is a second opinion from yourself.

An autocorrelation pitch detector accused six samples; four were innocent, because a plucked string
often has a louder 2nd harmonic than fundamental. A second heuristic accused a different six, also
wrong. The truth came from printing partials by hand, then validating the rule against those
hand-read files **before acting on any of its verdicts**. Two files needed fixing, not six.

If you are about to change N things on the strength of a script you just wrote, check the script
against something you verified independently first.

### 9.3 Verify the thing next to what you changed

This failed twice, the same way both times. Split-disc work was verified for split discs and
silently made every root ring invisible. **After a change, check what it touched, not what it was
for.**

### 9.4 Identify anything critical twice, independently, and fail the build if they disagree

A mirrored fretboard still looks like a valid fretboard. So does a shape in the wrong container.
When transcribing 30 shapes, string order was settled *by fit* — only one convention yields a
consistent chord — and each shape's container was identified both by the library's colour coding and
by which strings carry the root. **The generator throws if the two signals disagree.** Neither alone
was trustworthy; together they are.

The guitar apps' `skills/verify-platform/verify.mjs` is built this way: it duplicates `OPEN_MIDI` rather than
importing it, and fails if its copy and the app's disagree. Do not "fix" that duplication.

### 9.5 Compare before you replace

Told to replace five arpeggio shapes from a new library, comparison showed **three were already
byte-identical** and only two differed. That turned "some shapes have extra notes" into a precise
checkable claim, and meant three shapes were left alone instead of churned.

### 9.6 When a design is rejected, re-derive it; do not retune it

He rejected an oval that enclosed three roots. The wrong response is a smaller oval. The right one
was to ask what the oval was failing to say — which produced the rule "a three-root shape is two
root shapes" — and then to make it **structurally impossible** for an oval to swell into a region,
rather than a policy someone has to remember.

### 9.7 Make things reversible when told they might be reverted

*"we might revert so do it accordingly"* is an instruction about structure. One component, one
boolean prop, no musical logic passing through it — so reverting is deleting a file and a prop.

### 9.8 Say what you did not do

Every session ends with something unfinished or uncertain. **Name it** — in the worklog's `Open:`
line, in `NEXT.md`, and in the reply. He is deciding what to build next and cannot do that from a
report containing only successes.

Worth copying: the sampler was 47 cents out of tune across the neck and that was *reported* rather
than silently "fixed"; the two least trustworthy rows in the shape library said so in their own
provenance.

### 9.9 Trust the gate

The gate has caught real defects that would otherwise have shipped: ASCII `b3` where the catalog
uses `♭3`, a provenance record with no id. When it fails it is usually right. **Fix the cause, never
the check.**

If a check has a deliberate tripwire — an arity assertion, a count — and it fires, the firing *is*
the review conversation. Raise the number only with the reasoning written at it.

### 9.10 Reproduce the user's path, not only a synthetic fixture

A green synthetic regression is not evidence that his actual progression, startup state or loop
state is correct. A lead-in guard passed its fixture and still played the wrong octave on the real
Chapter 17 progression.

1. Reproduce the actual path with shipped data, real compiler setup, actual level, first chorus.
2. Check the transition that matters, including startup and the loop seam.
3. Add a regression against that real path. A synthetic unit fixture may supplement it; it cannot be
   the only proof.
4. Verify in the live browser when the behaviour is visible there, and say explicitly what was not
   verified.

### 9.11 If it has to be read, give it time to be read

**Omkar, verbatim:** *"Keep the question for 2 beats, beat 2 to beat 3 is a very fast change
unreadable rn … Keep the randomizing animation for 2sec, right now it's too fast to read it … User
readibility is important when something requires user to read it"*.

Both were correct implementations of what he asked for, and both were unusable.

- **Ask how long words are on screen, in seconds, at the tempo the exercise runs at.** A beat is not
  a unit of reading time: 60–160bpm makes a beat 1.0s down to 0.38s.
- **Give a phrase at least ~1.5–2s**, and prefer half a bar to a beat. If two phrases would each get
  one beat, you want one phrase.
- **Change the wording as rarely as the meaning allows.**
- **Animation duration is not reading time.** A 2s animation whose word is legible for 400ms is a
  400ms cue. Hold the readable phase; move only at the ends.
- This does not license slow interface motion. State *transitions* stay under ~200ms. Fast to
  change, slow to replace.

### 9.12 Sampling a position twice is not checking a mapping

The newest rule, and it cost a shipped bug. A loop feature was verified by reading the bar number
before and after disengaging: it said 6 then 7, so it passed. It was luck — the underlying step
counter had drifted and `step % form` happened to land on bar 7 that time.

**When you change a mapping from one space to another (step→tick, fret→pitch, index→row), assert the
mapping, not two of its outputs.** Extract it as a pure function and test it directly, even when the
real caller is a class with private state. If the thing you want to check is private, that is a
reason to extract it, not a reason to sample it.

---

### 9.13 A run is not a video — design for the hand that slips

**Omkar, verbatim:** *"In exercise 1 and 2 what if I pressed stop accidently? then I'll have to do
all te 21 groupings again to get to the next exercise. It's not a video then how am i supposed to go
back and forth. Find a neat and tidy solution … Update your agents md so you take care of these
senarios by yourself in the future"*

Finger Independence 1 shipped as a faithful copy of a 4:21 video, and Stop threw the place away.
Every line was correct; the product was unusable the first time a hand slipped. A video has a
scrubber. This app had nothing, because nobody asked what happens *after* the happy path.

**Before any exercise is reported done, walk these and make each one cheap:**

- **Interrupted.** Stop — on purpose or by accident — mid-way. Where does Start take them? Losing
  more than the bar they were in is a defect.
- **Wants to go back.** They fluffed a section. How many presses to be there again?
- **Wants to skip.** The first section is easy for them. Can they start at the third?
- **Wants to stay.** One section is the hard one. Can they drill just it?
- **Came back later.** Tab closed, lunch eaten. Does it remember? (Decide; say which.)
- **Long.** Anything over about a minute needs visible progress — where am I, how much is left.

This is not a licence for settings. The answer should usually be **one small control that is also
the progress display** — the thing that shows where you are is the thing you press to go there. If
a scenario needs a paragraph of UI to handle, re-derive the control (§9.6) rather than adding one.

---

## 10. What did not come across, and why

- **No code.** Not the fretboard, the sampler, the transport or the stylesheet. Each is a guess about
  §0 — a sheet music app may have no fretboard and no clock. When §0 calls for one, copy it from
  `../Guitar Technique Trainer` or `../guitar-app-template/starter` deliberately, and record it.
- **Technique Trainer §9.13's last paragraph** (non-negotiable 2, the clock) and **§9.14–§9.15** —
  playing a line as a guitarist would, fingering generated lines. They are about a practice app's
  transport and generators. If this app plays back or generates, read them there.
- **The guitar non-negotiables** — branded string index, finger colours, CAGED. If tab enters §0, the
  string-index rule (`../Guitar Technique Trainer/docs/01-fretboard-logic.md`) comes with it first:
  it is the most expensive bug available in that domain.

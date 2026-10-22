---
name: user-scenarios
description: Use before designing or changing any feature a user touches, and again before reporting it done. Walk the feature as the user — every question they could ask, every permutation and the permutations of those — write the answers down, decide them, and build to them. Omkar should never have to be the one who thinks of the scenario.
---

# user-scenarios

Omkar, verbatim: *"you put yourself in the shoes of the user who's using the thing and then ask each
and every question that can be possibly asked by the user, for each feature there are multiple
permutations and those permutations have permutations. (this is what I have been doing to guide you,
I need you to do it yourself)"* — and: *"You ask me only when something drastic needs to be done. and
always verify your work using screenshots."*

Almost every correction he has had to make was a scenario nobody walked: Stop throwing away the user's
place, a line drawn as a chord, a workout crammed to 1–2 minutes per exercise, a "slow down" button
that made it faster. Each one passed its tests. **Tests check what you thought of. This skill is for
what you did not.**

## When

- **Before** writing code for anything the user sees, presses, hears, reads or waits through.
- **Again before reporting done** — walk the list against the running app, with screenshots.
- When he reports something: find the scenario it belongs to, then walk the ones next to it.

## How

### 1. Be several users

Walk the feature once as each of these. Different users ask different questions.

| Who | What they bring |
|---|---|
| **First time** | Knows nothing. No history, no settings, nothing saved. |
| **Regular** | Weeks of history. Expects it to remember and to have learned. |
| **Strong** | Finds the easy setting trivial. Will be bored before they are challenged. |
| **Struggling** | Finds the easy setting hard. Will quit before they are helped. |
| **Uneven** | Strong at one thing, weak at another. The common case. |
| **Hurried** | A few minutes. Wants the most out of them, not a token pass at everything. |
| **Long session** | An hour or more. Fatigue, boredom, attention. |
| **Clumsy** | Presses the wrong thing, stops by accident, closes the tab. |
| **Opinionated** | Likes one thing, hates another. Wants it their way without settings. |
| **Hands busy** | Holding an instrument, cooking, driving. Every press costs them. |

Add the ones particular to the product.

### 2. Walk the journey, stage by stage

At each stage ask **what do they want, what do they see, what do they press, what happens next, and
what if they do something else**:

1. **Discover** — how do they find it? What do they think it does before they try it?
2. **Set up** — every choice: nothing chosen, everything, one thing, the same thing twice, the
   minimum, the maximum, a combination that does not fit.
3. **Start** — the first second and the first minute. Told enough? Too much?
4. **During** — the happy path, then: bored, too hard, made a mistake, wants to change something, to
   stop, to stay, to skip, to go back.
5. **Interrupted** — by accident, a phone call, tab closed, laptop asleep, a code reload, another device.
6. **Finish** — on time, early, late. What do they learn? What happens to what they did?
7. **Come back** — tomorrow, next week, a month later. Same thing, an edited thing, a new thing.
8. **Over weeks** — does it get better at them? Does anything starve, repeat, get stuck or ratchet?

### 3. Permute

For each answer, vary its inputs: zero, one, many; first, middle, last; all the same, all different;
at the floor, at the ceiling, past them. **Then permute the permutations**: a struggling user in a
10-minute session with one favourite pinned, who skips the first item.

Stop when a new permutation gives the same answer as one already written.

### 4. Write each scenario down

In the project, one file per feature — `skills/user-scenarios/<feature>.md` if the repo has a shared
skills folder, else `docs/scenarios/<feature>.md`. Each scenario:

```
- **<who> · <situation>** — <what they would ask or do>
  → <what the app does>. [built | build now | open: <why it is his>]
```

"What the app does" is a behaviour, never "handle gracefully". If it cannot be said in one line, the
design is not finished.

### 5. Decide, don't ask

Answer each scenario yourself with the best design you can justify. Research when it helps, and cite
it in the doc. Mark it `open` and ask him **only** when the answer is drastic: it breaks one of the
project's non-negotiables, deletes something he made, or overturns one of his rulings. Everything else:
decide, build, and record what you inferred where the project records decisions.

### 6. Build to the list, then verify against it

- Each `build now` scenario gets a test where it can be expressed as one — assert the mapping, not two
  of its outputs.
- Drive the running app through every visible scenario. **Screenshot each state**, and measure the
  live DOM for anything about size or overflow (screenshots come back downscaled).
- When the walk finds a defect, fix it, write a test that fails without the fix (toggle it to prove
  that), and add it to a "What walking it found" list at the bottom of the file.
- Update the file: `build now` becomes `built`.

## Rules that come with it

- **The best answer is usually one control that does two jobs** — the thing that shows where you are
  is the thing you press to go there. A scenario that needs a paragraph of UI needs a different design.
- **No settings to escape a decision.** If two users want different things, tell them apart from what
  they do, not by asking them to configure it.
- **His words beat the walk.** Where he has ruled, the scenario's answer is his ruling.
- **Report short.** The walk lives in the file; the reply is the finding and what is left open.

# Start here

1. `AGENTS.md`, in full. §0 first — it says what this app is, and it is blank.
2. `NEXT.md` — what is to be done, in order.
3. The tail of `WORKLOG.md`, and every `Type:** decision` entry — his rulings are authority.
4. `CLAUDE.md` — the repo map and commands.

**The layering.** `src/core` holds musical truth as plain TypeScript with tests: no React, no SVG,
no CSS. `src/ui` draws it. A rendering never stores what it shows (non-negotiable 3), and `core`
never imports `ui` (the gate fails the build).

**Where the guitar apps' knowledge is, when it is needed.** Nothing was copied in; read it there.

| Need | Read |
|---|---|
| Exact ticks, meters, the 12/8 beat bug | `../guitar-app-template/starter/core/ticks.ts`, `docs/02-music-model.md` there |
| Audio, sampler, one AudioContext, a transport | `../Guitar Technique Trainer/docs/04-sound.md`, `src/core/player.ts`, `sampler.ts` |
| Tab and string order | `../Guitar Technique Trainer/docs/01-fretboard-logic.md` |
| Live-DOM measurement recipes | `../Guitar Technique Trainer/docs/07-verification.md` |
| What has gone wrong before | `../Guitar Technique Trainer/docs/06-setbacks.md` |
| Shipping inside learnMusicIn | `../CLAUDE.md` ("The vendor seam"), `../learnMusicIn/CLAUDE.md` |

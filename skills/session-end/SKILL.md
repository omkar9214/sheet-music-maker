---
name: session-end
description: Use when finishing a session, before you stop working. Hands the baton on — verifies, records what happened and what is left, then commits.
---

# session-end

Nothing is finished until the next session could pick it up without asking you anything.

## 1. The gate

```bash
npm run check
```

**Must pass.** If it does not, either fix the cause or leave the work uncommitted and say
so plainly — never commit over a red gate, and never edit the check to make it green.

## 2. The worklog

Append a `work` entry. Format in `AGENTS.md` §2.2.

**It must carry a verification line quoting the command and its result.** "Tests pass" is
not a verification line; `EXIT=0 — verify-repo 5 checks passed, 60 tests in 5 files, tsc -b clean`
is. Add what you drove in the browser and what you measured.

**If Omkar gave any instruction this session, append a `decision` entry too** — verbatim,
separate from the work entry, with your inferences marked as inferences.

```bash
grep -c 'Type:\*\* decision' WORKLOG.md   # must have risen if he spoke
```

Zero decision entries in a session where he spoke is a defect, not a tidy worklog.

## 3. Say what you did not do

`AGENTS.md` §9.8. Every session ends with something unfinished or uncertain. Name it in
three places:

- the worklog's `Open:` line,
- `NEXT.md`,
- the reply to him.

**Especially the things you decided by inference and he has not confirmed.** He is deciding
what to build next and cannot do that from a report containing only successes.

## 4. `NEXT.md`

Leave it accurate. Name the branch and what main was at when it was cut, so the next session
can see the gap without measuring it.

## 5. Commit

```bash
git add -A
git commit -m "<what changed>"
```

One logical change per commit, so a bad change can be reverted without taking good work
with it. **Pushing is Omkar's call — ask, do not assume.** Never `reset --hard`, never
`push --force`.

## 6. The reply

One sentence with the finding, then the numbers, then what is open. No headings, no bullet
list of what you touched, no restating his instruction back to him. `AGENTS.md` §7.1.

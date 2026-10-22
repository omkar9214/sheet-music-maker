---
name: session-start
description: Use at the beginning of every session, before reading code or making any change. Picks up the baton — establishes what was done, what is next, and whether the tree is safe to work in.
---

# session-start

The last session just put the work down. Pick it up properly before touching anything.

## 1. Is the tree safe

```bash
git status --short --branch
```

**It must be clean before any branch switch.** If it is not, the previous session ended
badly — **do not tidy it up and do not commit it.** Say what is uncommitted and wait.

## 2. Get on the right branch

Whoever owns the repo works on the main branch directly. The other agent works on the
`task/<slug>` branch named in `NEXT.md`, and **catches up before anything else**:

```bash
git fetch origin
git log --oneline HEAD..origin/main   # what you missed. Read it.
git merge origin/main
```

A conflict here is a design question, not a text-editing one. Stop and ask.

## 3. Read the baton

`WORKLOG.md` is what has been done — append-only, newest at the bottom. `NEXT.md` is what is
to be done. Read the tail of the first and all of the second.

```bash
grep -n 'Type:\*\* decision' WORKLOG.md | tail -20
```

**The `decision` entries are Omkar's rulings and they are authority.** You do not relitigate
one; if you think one is wrong, say so and log a `correction` — never silently build the
other way.

Read the full text of an entry only when the item you are taking depends on its detail.

## 4. Read the rules

`AGENTS.md`, in full, every session. It changes. §2.1 (worklog), §7.1 (answer short) and
§7.2 (a mode that narrows) are the three most often broken.

If this is your first session on the project, `docs/00-START-HERE.md` first.

## 5. Confirm the gate is green before you change anything

```bash
npm run check
```

**Do this before your first edit, not after.** A gate that was already red is not something
you want to discover after an hour of work — and you need to know whether you broke it.

## 6. What not to do

- Do not start by "cleaning up" what the last session did. If something looks wrong, say so
  and log a `correction`.
- Do not reread the repository blindly. The worklog is the index.
- Do not switch branches with uncommitted work.
- Do not run `git switch` in another agent's working directory.

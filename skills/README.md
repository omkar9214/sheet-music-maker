# skills/

One copy each, shared by every agent. **Neither agent has a private version, so neither can drift.**
`.claude/skills/` holds symlinks to these, not copies.

| Skill | Use it when |
|---|---|
| `session-start` | Beginning any session, before reading code or making a change |
| `session-end` | Finishing a session, before you stop |
| `verify-repo` | The gate fails, or a rule is being added to it |
| `user-scenarios` | Before designing a feature the user touches, and before reporting it done |

`user-scenarios` is also global (`~/.claude/skills/user-scenarios`); this is a copy of it so an agent
without that folder (Codex) reads the same text. Scenario files go beside it, one per feature.

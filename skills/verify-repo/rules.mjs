/**
 * The rules in AGENTS.md that a machine can check. Pure functions over text, so the test beside
 * this file can feed each one a known-bad input and prove it fires (AGENTS.md §9.2: validate the
 * instrument before you trust its verdicts). `verify.mjs` reads the files on disk and calls these.
 */

/** AGENTS.md §7.3 / docs/00: `src/core` decides musical truth and may never import from `src/ui`. */
export function coreImportsUi(path, text) {
  if (!path.startsWith("src/core/")) return [];
  return [...text.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((spec) => /(^|\/)ui(\/|$)/.test(spec))
    .map((spec) => `${path}: imports ${spec} — core may never import from ui`);
}

/** AGENTS.md §7.3: strict TypeScript, no `any`. */
export function usesAny(path, text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    if (/(:\s*any\b|\bas\s+any\b|<any>|any\[\])/.test(code)) out.push(`${path}:${i + 1}: \`any\``);
  });
  return out;
}

/** AGENTS.md §2: WORKLOG.md is append-only — the committed file must be a prefix of the one on disk. */
export function worklogRewritten(committed, current) {
  if (committed === null) return [];
  return current.startsWith(committed) ? [] : ["WORKLOG.md: an existing entry was edited or deleted — append a correction instead (§2)"];
}

/**
 * AGENTS.md §2.1–2.2: every entry has a Type, decisions are numbered once each and in order, and a
 * work entry carries a Verified line.
 */
export function worklogEntries(text) {
  const out = [];
  const heads = [...text.matchAll(/^## (\d{4}-\d{2}-\d{2}) — [^\n]+$/gm)];
  let last = 0;
  heads.forEach((h, i) => {
    const body = text.slice(h.index, heads[i + 1]?.index ?? text.length);
    const title = h[0].slice(3);
    const type = body.match(/\*\*Type:\*\* (\w+)/)?.[1];
    if (!type) out.push(`WORKLOG.md: "${title}" has no **Type:** line`);
    const n = title.match(/decision (\d+):/)?.[1];
    if (type === "decision") {
      if (!n) out.push(`WORKLOG.md: "${title}" is a decision without a number`);
      else if (Number(n) !== last + 1) out.push(`WORKLOG.md: decision ${n} follows decision ${last}`);
      else last = Number(n);
      if (!/^> \*"/m.test(body)) out.push(`WORKLOG.md: decision ${n} quotes nothing verbatim`);
    }
    if (type === "work" && !/\*\*Verified:\*\*/.test(body)) out.push(`WORKLOG.md: "${title}" claims work with no **Verified:** line`);
  });
  return out;
}

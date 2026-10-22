#!/usr/bin/env node
/**
 * The gate's first step (`npm run check`). Reads the files on disk, not the modules that describe
 * them. Exits 1 on any failure. The rules themselves are in `rules.mjs` and tested in
 * `rules.test.mjs`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { coreImportsUi, usesAny, worklogEntries, worklogRewritten } from "./rules.mjs";

// fileURLToPath, not `.pathname`: the repo folder has spaces, and `.pathname` keeps them as %20.
const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");
const walk = (dir) =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

const sources = walk("src").filter((p) => /\.(ts|tsx)$/.test(p));
let committed = null;
try {
  committed = execFileSync("git", ["show", "HEAD:WORKLOG.md"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch {
  // No commit yet, or WORKLOG.md not yet committed: nothing to be a prefix of.
}
const worklog = read("WORKLOG.md");

const checks = [
  ["core never imports ui", sources.flatMap((p) => coreImportsUi(p, read(p)))],
  ["no any", sources.flatMap((p) => usesAny(p, read(p)))],
  ["worklog append-only", worklogRewritten(committed, worklog)],
  ["worklog entries well-formed", worklogEntries(worklog)],
  ["AGENTS.md §0 present", /^## 0\. The brief/m.test(read("AGENTS.md")) ? [] : ["AGENTS.md: §0 heading is gone"]],
];

const failed = checks.filter(([, bad]) => bad.length > 0);
for (const [name, bad] of failed) {
  console.error(`✗ ${name}`);
  for (const b of bad) console.error(`  ${b}`);
}
if (failed.length > 0) process.exit(1);
console.log(`verify-repo: ${checks.length} checks passed`);

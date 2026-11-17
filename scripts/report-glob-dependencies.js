#!/usr/bin/env node
/**
 * Read-only report for legacy glob dependencies.
 * Inspects npm's installed dependency tree; never installs or changes packages.
 */
import { spawnSync } from "node:child_process";

const run = spawnSync("npm", ["ls", "glob", "--all", "--json"], {
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
  timeout: 30000,
  shell: false
});
if (run.error || !run.stdout?.trim()) {
  console.error("XSUS glob report: unable to inspect installed dependencies.");
  if (run.error) console.error(run.error.message);
  process.exitCode = 1;
} else {
  let tree;
  try {
    tree = JSON.parse(run.stdout);
  } catch {
    console.error("XSUS glob report: npm returned invalid JSON.");
    process.exitCode = 1;
  }
  if (tree) {
    const matches = [];
    const visit = (node, path, depth) => {
      if (!node || typeof node !== "object" || depth > 64) return;
      const dependencies = node.dependencies;
      if (!dependencies || typeof dependencies !== "object") return;
      for (const [name, child] of Object.entries(dependencies)) {
        const next = [...path, name];
        if (name === "glob") {
          matches.push({ version: child?.version ?? "unknown", via: next.join(" > ") });
        }
        visit(child, next, depth + 1);
      }
    };
    visit(tree, [], 0);
    if (matches.length === 0) {
      console.log("XSUS glob report: no glob dependency found in npm's installed tree.");
    } else {
      for (const item of matches)
        console.log("XSUS glob report:", item.version, "via", item.via);
      const legacy = matches.filter(item => /^10\./.test(item.version));
      if (legacy.length)
        console.warn("XSUS glob report: legacy glob 10.x detected; update its parent dependency after compatibility review.");
    }
    // npm ls can exit nonzero for unrelated missing/invalid packages. Do not conceal that.
    if (run.status !== 0) {
      console.error("XSUS glob report: npm ls reported dependency-tree errors (exit", run.status, ").");
      process.exitCode = 1;
    }
  }
}

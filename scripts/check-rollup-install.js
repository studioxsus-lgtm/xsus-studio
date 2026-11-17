#!/usr/bin/env node
/**
 * Read-only Rollup preflight. Verify every installed Rollup instance,
 * not only the first package resolved from this script.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const expected = manifest.overrides?.rollup;
if (typeof expected !== "string" || !/^\d+\.\d+\.\d+$/.test(expected)) {
  console.error("XSUS dependency preflight: explicit Rollup override is missing.");
  process.exitCode = 1;
} else {
  const run = spawnSync("npm", ["ls", "rollup", "--all", "--json"], {
    encoding: "utf8", shell: false, timeout: 30000, maxBuffer: 8 * 1024 * 1024
  });
  if (run.error || !run.stdout?.trim()) {
    console.error("XSUS dependency preflight: unable to inspect installed Rollup versions.");
    process.exitCode = 1;
  } else {
    try {
      const tree = JSON.parse(run.stdout);
      const versions = [];
      const visited = new WeakSet();
      const visit = (node, depth) => {
        if (!node || typeof node !== "object" || depth > 64 || visited.has(node)) return;
        visited.add(node);
        for (const [name, child] of Object.entries(node.dependencies ?? {})) {
          if (name === "rollup") versions.push(child?.version ?? "unknown");
          visit(child, depth + 1);
        }
      };
      visit(tree, 0);
      if (run.status !== 0 || versions.length === 0 || versions.some(v => v !== expected)) {
        console.error("XSUS dependency preflight: Rollup dependency tree mismatch.",
          "Expected:", expected, "Installed:", versions.join(", ") || "none",
          "npm ls exit:", run.status);
        process.exitCode = 1;
      } else {
        console.log("XSUS dependency preflight: all", versions.length,
          "Rollup installation(s) match", expected);
      }
    } catch {
      console.error("XSUS dependency preflight: invalid npm dependency tree JSON.");
      process.exitCode = 1;
    }
  }
}

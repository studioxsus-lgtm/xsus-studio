#!/usr/bin/env node
/**
 * XSUS dependency preflight: verifies the installed Rollup version after npm install.
 * Run before tests; never modifies dependencies or suppresses npm warnings.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const expected = manifest.overrides?.rollup;
if (typeof expected !== "string" || !/^\d+\.\d+\.\d+$/.test(expected)) {
  console.error("XSUS dependency preflight: explicit Rollup override is missing.");
  process.exitCode = 1;
} else {
  try {
    const rollupPackage = require.resolve("rollup/package.json");
    const installed = JSON.parse(readFileSync(rollupPackage, "utf8")).version;
    if (installed !== expected) {
      console.error("XSUS dependency preflight: Rollup mismatch. Expected", expected, "but found", installed);
      process.exitCode = 1;
    } else {
      console.log("XSUS dependency preflight: Rollup", installed, "verified.");
    }
  } catch (error) {
    console.error("XSUS dependency preflight: Rollup is not installed or cannot be resolved.");
    process.exitCode = 1;
  }
}

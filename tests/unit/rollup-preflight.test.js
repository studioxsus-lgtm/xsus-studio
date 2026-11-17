import { test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../scripts/check-rollup-install.js", import.meta.url));
const cases = [
  { name: "accepts the expected nested Rollup version", versions: ["4.68.4"], exit: 0 },
  { name: "rejects mismatched nested Rollup version", versions: ["4.68.5"], exit: 1 },
  { name: "rejects mixed Rollup versions", versions: ["4.68.4", "4.68.5"], exit: 1 },
  { name: "rejects absent Rollup", versions: [], exit: 1 },
  { name: "rejects npm tree errors even with correct Rollup", versions: ["4.68.4"], npmExit: 1, exit: 1 },
  { name: "rejects malformed npm JSON", malformed: true, exit: 1 }
];

for (const scenario of cases) {
  test(scenario.name, () => {
    const dir = mkdtempSync(join(tmpdir(), "xsus-rollup-preflight-"));
    try {
      const dependencies = {
        vite: { version: "6.4.5", dependencies: {} }
      };
      scenario.versions.forEach((version, index) => {
        dependencies.vite.dependencies["wrapper" + index] = {
          version: "1.0.0", dependencies: { rollup: { version } }
        };
      });
      const fakeNpm = join(dir, "npm");
      writeFileSync(fakeNpm, "#!/bin/sh\ncat <<'XSUS_JSON'\n" +
        JSON.stringify({ dependencies }) + "\nXSUS_JSON\n");
      chmodSync(fakeNpm, 0o755);
      const run = spawnSync(process.execPath, [script], {
        encoding: "utf8", timeout: 10000,
        env: { ...process.env, PATH: dir + ":" + (process.env.PATH ?? "") }
      });
      assert.equal(run.status, scenario.exit, run.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

import { test, expect } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../scripts/report-glob-dependencies.js", import.meta.url));

const scenarios = [
  {
    name: "reports legacy glob 10 and its parent",
    output: JSON.stringify({ dependencies: { parent: { dependencies: { glob: { version: "10.5.0" } } } } }),
    exit: 0, contains: ["glob report: 10.5.0", "parent > glob", "legacy glob 10.x"]
  },
  {
    name: "reports no glob without false warning",
    output: JSON.stringify({ dependencies: {} }), exit: 0,
    contains: ["no glob dependency found"]
  },
  {
    name: "rejects malformed npm JSON",
    output: "{broken-json", exit: 1, contains: ["invalid JSON"]
  },
  {
    name: "does not conceal npm ls failures",
    output: JSON.stringify({ dependencies: {} }), npmExit: 1, exit: 1,
    contains: ["dependency-tree errors"]
  }
];

for (const scenario of scenarios) {
  test(scenario.name, () => {
    const dir = mkdtempSync(join(tmpdir(), "xsus-glob-report-"));
    try {
      const fakeNpm = join(dir, "npm");
      writeFileSync(fakeNpm, "#!/bin/sh\ncat <<'XSUS_JSON'\n" +
        scenario.output + "\nXSUS_JSON\nexit " + (scenario.npmExit ?? 0) + "\n");
      chmodSync(fakeNpm, 0o755);
      const run = spawnSync(process.execPath, [script], {
        encoding: "utf8", timeout: 10000,
        env: { ...process.env, PATH: dir + ":" + (process.env.PATH ?? "") }
      });
      expect(run.status).toBe(scenario.exit);
      const output = run.stdout + run.stderr;
      for (const part of scenario.contains) expect(output).toContain(part);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

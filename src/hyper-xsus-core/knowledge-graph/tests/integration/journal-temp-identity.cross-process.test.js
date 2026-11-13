import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureJournalTempIdentity, verifyJournalTempIdentity } from "../../integration/journal-temp-identity.js";

const name = ".journal.json.123e4567-e89b-42d3-a456-426614174000.tmp";
const childScript = [
  'import { writeFile, rename, unlink, symlink, appendFile } from "node:fs/promises";',
  'const [action, temp, journal, replacement] = process.argv.slice(1);',
  'if (action === "replace") { await writeFile(replacement, "replacement"); await rename(replacement, temp); }',
  'else if (action === "remove") await unlink(temp);',
  'else if (action === "symlink") { await unlink(temp); await symlink(journal, temp); }',
  'else if (action === "append") await appendFile(temp, "more");',
  'else throw new Error("Unknown action");',
].join("\n");

function runIndependentProcess(action, temp, journal, replacement) {
  const child = spawnSync(process.execPath,
    ["--input-type=module", "-e", childScript, action, temp, journal, replacement],
    { encoding: "utf8", timeout: 15000 });
  if (child.error) throw child.error;
  expect(child.status, child.stderr).toBe(0);
}

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-cross-process-identity-"));
  const journal = join(dir, "journal.json");
  const temp = join(dir, name);
  try {
    await writeFile(journal, "committed");
    await writeFile(temp, "pending");
    const snapshot = await captureJournalTempIdentity(journal, name);
    expect(snapshot).not.toBeNull();
    await run({ dir, journal, temp, snapshot });
    expect(await readFile(journal, "utf8")).toBe("committed");
  } finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — cross-process file identity safety v2.5.0", () => {
  it("detects replacement by an independent process", async () => {
    await fixture(async ({ dir, journal, temp, snapshot }) => {
      runIndependentProcess("replace", temp, journal, join(dir, "replacement"));
      const result = await verifyJournalTempIdentity(journal, snapshot);
      expect(result.matches).toBe(false);
      expect(result.safeToDeleteAutomatically).toBe(false);
      expect(await readFile(temp, "utf8")).toBe("replacement");
    });
  });

  it("detects removal by an independent process", async () => {
    await fixture(async ({ journal, temp, snapshot }) => {
      runIndependentProcess("remove", temp, journal, temp + ".unused");
      expect(await verifyJournalTempIdentity(journal, snapshot)).toMatchObject({
        matches: false, current: null, safeToDeleteAutomatically: false,
      });
    });
  });

  it("rejects a symlink inserted by an independent process", async () => {
    await fixture(async ({ journal, temp, snapshot }) => {
      runIndependentProcess("symlink", temp, journal, temp + ".unused");
      expect(await verifyJournalTempIdentity(journal, snapshot)).toMatchObject({
        matches: false, current: null, safeToDeleteAutomatically: false,
      });
    });
  });

  it("detects content growth by an independent process", async () => {
    await fixture(async ({ journal, temp, snapshot }) => {
      runIndependentProcess("append", temp, journal, temp + ".unused");
      const result = await verifyJournalTempIdentity(journal, snapshot);
      expect(result.matches).toBe(false);
      expect(result.current.size).toBeGreaterThan(snapshot.size);
      expect(result.safeToDeleteAutomatically).toBe(false);
    });
  });
});

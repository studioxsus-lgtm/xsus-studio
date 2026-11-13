import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const writerCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const store = createTransactionJournalStore({ filePath: process.argv[1], exclusiveLock: true });',
  'await store.save([',
  '  { id: 1, state: "running", attempted: 4, added: 2 },',
  '  { id: 2, state: "completed", attempted: 3, added: 3 },',
  '  { id: 3, state: "failed", attempted: 2, added: 0, error: "expected" }',
  ']);',
  'await store.close();',
  'process.stdout.write("COMMITTED\\n");',
].join("\n");

const recoveryCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const store = createTransactionJournalStore({ filePath: process.argv[1], exclusiveLock: true });',
  'const entries = await store.recoverInterrupted();',
  'await store.close();',
  'process.stdout.write(JSON.stringify(entries));',
].join("\n");

function run(code, filePath) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", code, filePath],
    { encoding: "utf8", timeout: 15000 });
}

describe("Hyper XSUS Core — cross-process journal recovery v3.0.0", () => {
  it("recovers a committed running transaction after the original process exits", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-recovery-v30-"));
    const filePath = join(dir, "journal.json");
    try {
      const writer = run(writerCode, filePath);
      expect(writer.status, writer.stderr).toBe(0);
      expect(writer.stdout).toContain("COMMITTED");
      const recovered = run(recoveryCode, filePath);
      expect(recovered.status, recovered.stderr).toBe(0);
      const entries = JSON.parse(recovered.stdout);
      expect(entries).toEqual([
        { id: 1, state: "interrupted", attempted: 4, added: 2 },
        { id: 2, state: "completed", attempted: 3, added: 3 },
        { id: 3, state: "failed", attempted: 2, added: 0, error: "expected" },
      ]);
      const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
      try {
        expect(await store.load()).toEqual(entries);
        const before = await readFile(filePath, "utf8");
        const revision = (await store.loadWithRevision()).revision;
        expect(await store.recoverInterrupted()).toEqual(entries);
        expect(await readFile(filePath, "utf8")).toBe(before);
        expect((await store.loadWithRevision()).revision).toBe(revision);
      } finally { await store.close(); }
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 45000);

  it("fails closed on malformed committed JSON without overwriting it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-recovery-invalid-v30-"));
    const filePath = join(dir, "journal.json");
    try {
      const malformed = '{"version":"0.1.0","entries":[';
      await writeFile(filePath, malformed);
      const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
      try {
        await expect(store.recoverInterrupted()).rejects.toThrow();
        expect(await readFile(filePath, "utf8")).toBe(malformed);
      } finally { await store.close(); }
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 30000);
});

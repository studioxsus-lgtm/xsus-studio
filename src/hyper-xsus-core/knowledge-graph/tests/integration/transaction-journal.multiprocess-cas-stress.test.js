import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });
const CHILDREN = 10;
const childScript = `
  import { createTransactionJournalStore } from ${JSON.stringify(moduleUrl)};
  const store = createTransactionJournalStore({
    filePath: process.argv[1], exclusiveLock: true,
  });
  const id = Number(process.argv[2]);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let conflicts = 0, busy = 0, committed = false;
  try {
    for (let attempt = 0; attempt < 250; attempt++) {
      try {
        const { entries, revision } = await store.loadWithRevision();
        if (entries.some((item) => item.id === id)) {
          throw new Error("Duplicate id already committed: " + id);
        }
        await store.saveIfRevision(
          [...entries, { id, state: "completed", attempted: 1, added: 1 }],
          revision,
        );
        committed = true;
        break;
      } catch (error) {
        if (error?.code === "XSUS_FILE_LOCK_BUSY") busy++;
        else if (error?.code === "XSUS_JOURNAL_REVISION_CONFLICT") conflicts++;
        else throw error;
        await sleep(Math.min(40, 3 + attempt % 11 + id % 7));
      }
    }
    if (!committed) throw new Error("CAS retry budget exhausted for " + id);
    process.stdout.write(JSON.stringify({ id, committed, conflicts, busy }) + "\\n");
  } finally { await store.close(); }
`;

function runChild(filePath, id) {
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", childScript, filePath, String(id)],
    { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const finished = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(new Error(`worker ${id} exited ${code}/${signal}: ${stderr}`));
        return;
      }
      try { resolve(JSON.parse(stdout.trim())); }
      catch (error) { reject(new Error(`worker ${id} invalid output: ${stdout}; ${error}`)); }
    });
  });
  // Attach a rejection handler immediately, including during sibling failures.
  finished.catch(() => {});
  return { child, finished };
}

describe("Transaction Journal — bounded real multi-process CAS stress", () => {
  it("commits all 10 distinct writers without losing updates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-multiprocess-cas-"));
    const path = join(dir, "journal.json");
    const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
    const workers = [];
    try {
      await store.saveIfRevision([entry(1)], null);
      for (let id = 2; id < CHILDREN + 2; id++) {
        workers.push(runChild(path, id));
      }
      const results = await Promise.all(workers.map((worker) => worker.finished));
      expect(results).toHaveLength(CHILDREN);
      expect(results.every((result) => result.committed)).toBe(true);
      const { entries, revision } = await store.loadWithRevision();
      expect(revision).toMatch(/^[a-f0-9]{64}$/);
      expect(entries).toHaveLength(CHILDREN + 1);
      expect(entries.map((row) => row.id).sort((a, b) => a - b))
        .toEqual(Array.from({ length: CHILDREN + 1 }, (_, i) => i + 1));
      console.info("XSUS multi-process CAS diagnostics", {
        workers: CHILDREN,
        conflicts: results.reduce((sum, result) => sum + result.conflicts, 0),
        busy: results.reduce((sum, result) => sum + result.busy, 0),
      });
    } finally {
      for (const { child } of workers) {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }
      await Promise.allSettled(workers.map((worker) => worker.finished));
      await store.close();
      await rm(dir, { recursive: true, force: true });
    }
  }, 60000);
});

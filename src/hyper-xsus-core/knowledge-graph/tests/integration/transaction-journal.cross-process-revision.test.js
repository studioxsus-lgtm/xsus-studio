import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const row = (id) => ({ id, state: "completed", attempted: 1, added: 1 });

function contender(path, id) {
  const script = `
    import { createTransactionJournalStore } from ${JSON.stringify(moduleUrl)};
    const store = createTransactionJournalStore({
      filePath: process.argv[1], exclusiveLock: true,
    });
    const id = Number(process.argv[2]);
    try {
      const { entries, revision } = await store.loadWithRevision();
      process.stdout.write("READY\\n");
      await new Promise((resolve, reject) => {
        process.stdin.once("data", resolve);
        process.stdin.once("end", () => reject(new Error("barrier closed")));
      });
      try {
        const next = [...entries, { id, state: "completed", attempted: 1, added: 1 }];
        const updated = await store.saveIfRevision(next, revision);
        process.stdout.write("SAVED " + updated + "\\n");
      } catch (error) {
        if (error?.code === "XSUS_JOURNAL_REVISION_CONFLICT") {
          process.stdout.write("CONFLICT\\n");
        } else if (error?.code === "XSUS_FILE_LOCK_BUSY") {
          process.stdout.write("BUSY\\n");
        } else {
          throw error;
        }
      }
    } finally { await store.close(); }
  `;
  return spawn(process.execPath, ["--input-type=module", "-e", script, path, String(id)], {
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function observe(child) {
  let stdout = "", stderr = "";
  const ready = new Promise((resolve, reject) => {
    child.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.includes("READY")) resolve();
    });
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!stdout.includes("READY")) reject(new Error(`child exited before READY: ${code} ${stderr}`));
    });
  });
  const exit = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`child exit ${code}/${signal}: ${stderr}`));
    });
  });
  return { ready, exit, output: () => stdout };
}

describe("Transaction Journal — real cross-process revision conflicts", () => {
  it("accepts only one stale-base update across two independent processes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-cross-process-cas-"));
    const path = join(dir, "journal.json");
    const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
    const children = [];
    try {
      await store.saveIfRevision([row(1)], null);
      const a = contender(path, 2), b = contender(path, 3);
      children.push(a, b);
      const oa = observe(a), ob = observe(b);
      await Promise.race([
        Promise.all([oa.ready, ob.ready]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("read barrier timeout")), 10000)),
      ]);
      a.stdin.end("GO\n");
      await oa.exit;
      b.stdin.end("GO\n");
      await ob.exit;
      const results = [oa.output(), ob.output()];
      expect(results.filter((s) => s.includes("SAVED"))).toHaveLength(1);
      expect(results.filter((s) => s.includes("CONFLICT"))).toHaveLength(1);
      const ids = (await store.load()).map((entry) => entry.id);
      expect(ids).toHaveLength(2);
      expect(ids[0]).toBe(1);
      expect([2, 3]).toContain(ids[1]);
    } finally {
      for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }
      await store.close();
      await rm(dir, { recursive: true, force: true });
    }
  }, 30000);
});

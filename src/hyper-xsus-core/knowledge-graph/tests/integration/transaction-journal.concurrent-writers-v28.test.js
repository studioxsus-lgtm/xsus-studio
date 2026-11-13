import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const workerCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const [filePath, id, revision] = process.argv.slice(1);',
  'const store = createTransactionJournalStore({ filePath, exclusiveLock: true });',
  'process.stdout.write("READY\\n");',
  'for await (const chunk of process.stdin) {',
  '  if (!chunk.toString().includes("GO")) continue;',
  '  try {',
  '    await store.saveIfRevision([{id:Number(id),state:"completed",attempted:1,added:1}], revision);',
  '    process.stdout.write("RESULT:success\\n");',
  '  } catch (error) {',
  '    process.stdout.write("RESULT:" + (error.code || "unexpected") + "\\n");',
  '  } finally { await store.close(); }',
  '  break;',
  '}',
].join("\n");

function launch(filePath, id, revision) {
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", workerCode, filePath, String(id), revision],
    { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", stderr = "";
  const waitFor = (token) => new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(new Error("Worker timeout: " + stderr)), 20000);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.off("error", onError);
      child.off("close", onClose);
      if (error) reject(error); else resolve(value);
    }
    function onData(chunk) {
      output += chunk.toString();
      if (output.includes(token)) finish(null, output);
    }
    function onError(error) { finish(error); }
    function onClose(code, signal) {
      finish(new Error("Worker exited early: " + code + "/" + signal + " " + stderr));
    }
    child.stdout.on("data", onData);
    child.on("error", onError);
    child.on("close", onClose);
    if (output.includes(token)) finish(null, output);
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  return {
    child,
    ready: waitFor("READY"),
    run: async () => {
      const done = waitFor("RESULT:");
      child.stdin.end("GO\n");
      const result = await done;
      const line = result.split("\n").find((line) => line.startsWith("RESULT:"));
      return line.slice("RESULT:".length);
    },
  };
}

describe("Hyper XSUS Core — concurrent writer integrity v2.8.0", () => {
  it("allows exactly one stale-revision writer and preserves the committed journal", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-writers-v28-"));
    const filePath = join(dir, "journal.json");
    const workers = [];
    try {
      const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
      let revision;
      try {
        await store.save([{ id: 1, state: "completed", attempted: 1, added: 1 }]);
        revision = (await store.loadWithRevision()).revision;
      } finally { await store.close(); }
      workers.push(launch(filePath, 2, revision), launch(filePath, 3, revision));
      await Promise.all(workers.map((worker) => worker.ready));
      const results = await Promise.all(workers.map((worker) => worker.run()));
      // A nonblocking exclusive lock may return BUSY rather than REVISION_CONFLICT.
      expect(results.filter((result) => result === "success")).toHaveLength(1);
      expect(results.filter((result) => result === "XSUS_JOURNAL_REVISION_CONFLICT" ||
        result === "XSUS_FILE_LOCK_BUSY")).toHaveLength(1);
      const committed = JSON.parse(await readFile(filePath, "utf8"));
      expect(committed.version).toBe(TRANSACTION_JOURNAL_VERSION);
      expect(committed.entries).toHaveLength(1);
      expect([2, 3]).toContain(committed.entries[0].id);
      expect(committed.entries[0]).toMatchObject({
        state: "completed", attempted: 1, added: 1,
      });
    } finally {
      for (const worker of workers) {
        if (worker.child.exitCode === null && worker.child.signalCode === null) worker.child.kill("SIGKILL");
      }
      await rm(dir, { recursive: true, force: true });
    }
  }, 60000);
});

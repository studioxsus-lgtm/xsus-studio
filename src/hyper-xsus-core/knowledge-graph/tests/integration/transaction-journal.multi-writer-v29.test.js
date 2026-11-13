import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const workerCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const [filePath, id, revision] = process.argv.slice(1);',
  'const store = createTransactionJournalStore({ filePath, exclusiveLock: true });',
  'process.stdout.write("READY\\n");',
  'process.stdin.once("data", async () => {',
  '  try {',
  '    await store.saveIfRevision([{ id: Number(id), state: "completed", attempted: 1, added: 1 }], revision);',
  '    process.stdout.write("RESULT:success\\n");',
  '  } catch (error) {',
  '    process.stdout.write("RESULT:" + (error.code || "unexpected") + "\\n");',
  '  } finally { await store.close(); }',
  '});',
].join("\n");

function worker(filePath, id, revision) {
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", workerCode, filePath, String(id), revision],
    { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "", exited = false;
  const listeners = [];
  const waitFor = (token) => new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(new Error("Timed out waiting for " + token + ": " + errors)), 90000);
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
      finish(new Error("Worker closed before " + token + ": " + code + "/" + signal + " " + errors));
    }
    child.stdout.on("data", onData);
    child.on("error", onError);
    child.on("close", onClose);
    if (output.includes(token)) finish(null, output);
  });
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  const ready = waitFor("READY\n");
  return {
    child, ready,
    run: async () => {
      const done = waitFor("RESULT:");
      child.stdin.end("GO\n");
      const result = await done;
      const line = result.split("\n").find((line) => line.startsWith("RESULT:"));
      return line.slice("RESULT:".length);
    },
  };
}

async function scenario(count) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-multiwriter-v29-"));
  const filePath = join(dir, "journal.json");
  const workers = [];
  try {
    const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
    let revision;
    try {
      await store.save([{ id: 1, state: "completed", attempted: 1, added: 1 }]);
      revision = (await store.loadWithRevision()).revision;
    } finally { await store.close(); }

    for (let i = 0; i < count; i++) workers.push(worker(filePath, i + 2, revision));
    await Promise.all(workers.map((item) => item.ready));
    const results = await Promise.all(workers.map((item) => item.run()));
    expect(results.filter((result) => result === "success")).toHaveLength(1);
    expect(results.filter((result) =>
      result === "XSUS_JOURNAL_REVISION_CONFLICT" ||
      result === "XSUS_FILE_LOCK_BUSY")).toHaveLength(count - 1);

    const raw = await readFile(filePath, "utf8");
    const committed = JSON.parse(raw);
    expect(committed.version).toBe(TRANSACTION_JOURNAL_VERSION);
    expect(committed.entries).toHaveLength(1);
    expect(committed.entries[0].id).toBeGreaterThanOrEqual(2);
    expect(committed.entries[0].id).toBeLessThan(count + 2);
    expect(committed.entries[0]).toMatchObject({
      state: "completed", attempted: 1, added: 1,
    });

    const verifier = createTransactionJournalStore({ filePath, exclusiveLock: true });
    try {
      const snapshot = await verifier.loadWithRevision();
      expect(snapshot.entries).toEqual(committed.entries);
      expect(snapshot.revision).toBe(createHash("sha256").update(raw, "utf8").digest("hex"));
    } finally { await verifier.close(); }
  } finally {
    for (const item of workers) {
      if (item.child.exitCode === null && item.child.signalCode === null) item.child.kill("SIGKILL");
    }
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Hyper XSUS Core — multi-writer transaction stress v2.9.0", () => {
  for (const count of [10, 25, 50]) {
    it("preserves one committed revision across " + count + " independent competing writers",
      async () => { await scenario(count); }, 180000);
  }
});

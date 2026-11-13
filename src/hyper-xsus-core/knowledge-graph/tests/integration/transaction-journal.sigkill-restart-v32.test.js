import { describe, it, expect } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const writerCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const store = createTransactionJournalStore({ filePath: process.argv[1], exclusiveLock: true });',
  'await store.save([',
  '  { id: 1, state: "running", attempted: 5, added: 2 },',
  '  { id: 2, state: "completed", attempted: 3, added: 3 }',
  ']);',
  'await store.close();',
  'process.stdout.write("COMMITTED\\n");',
  'process.stdin.resume();',
].join("\n");

const recoverCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const store = createTransactionJournalStore({ filePath: process.argv[1], exclusiveLock: true });',
  'const entries = await store.recoverInterrupted();',
  'const snapshot = await store.loadWithRevision();',
  'await store.close();',
  'process.stdout.write(JSON.stringify({ entries, snapshot }));',
].join("\n");

function waitForCommitted(child) {
  return new Promise((resolve, reject) => {
    let stdout = "", stderr = "", settled = false;
    const timer = setTimeout(() => finish(new Error("Writer timed out: " + stderr)), 15000);
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.stderr.off("data", onStderr);
      child.off("error", onError);
      child.off("close", onClose);
      if (error) reject(error); else resolve();
    }
    function onData(chunk) {
      stdout += chunk.toString();
      if (stdout.includes("COMMITTED\n")) finish();
    }
    function onStderr(chunk) { stderr += chunk.toString(); }
    function onError(error) { finish(error); }
    function onClose(code, signal) {
      finish(new Error("Writer exited before COMMITTED: " + code + "/" + signal + " " + stderr));
    }
    child.stdout.on("data", onData);
    child.stderr.on("data", onStderr);
    child.on("error", onError);
    child.on("close", onClose);
  });
}

function runRecovery(filePath) {
  const result = spawnSync(process.execPath,
    ["--input-type=module", "-e", recoverCode, filePath],
    { encoding: "utf8", timeout: 15000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("Hyper XSUS Core — real process termination and restart recovery v3.2.0", () => {
  it.skipIf(process.platform === "win32")(
    "recovers a committed running transaction after SIGKILL and a fresh process restart",
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "xsus-sigkill-recovery-v32-"));
      const filePath = join(dir, "journal.json");
      const child = spawn(process.execPath,
        ["--input-type=module", "-e", writerCode, filePath],
        { stdio: ["pipe", "pipe", "pipe"] });
      try {
        await waitForCommitted(child);
        const before = JSON.parse(await readFile(filePath, "utf8"));
        expect(before.entries.map((entry) => entry.state)).toEqual(["running", "completed"]);

        const terminated = new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("SIGKILL did not terminate writer")), 15000);
          child.once("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
        });
        expect(child.kill("SIGKILL")).toBe(true);
        const exit = await terminated;
        expect(exit.signal).toBe("SIGKILL");

        const first = runRecovery(filePath);
        expect(first.entries).toEqual([
          { id: 1, state: "interrupted", attempted: 5, added: 2 },
          { id: 2, state: "completed", attempted: 3, added: 3 },
        ]);
        expect(first.snapshot.entries).toEqual(first.entries);
        const bytes = await readFile(filePath, "utf8");
        expect(first.snapshot.revision).toBe(
          createHash("sha256").update(bytes, "utf8").digest("hex")
        );

        const second = runRecovery(filePath);
        expect(second).toEqual(first);
        expect(await readFile(filePath, "utf8")).toBe(bytes);
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        await rm(dir, { recursive: true, force: true });
      }
    }, 60000);
});

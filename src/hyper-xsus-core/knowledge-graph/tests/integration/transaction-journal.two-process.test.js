import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const lockUrl = new URL("../../integration/exclusive-file-lock.js", import.meta.url).href;
const journalUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-two-process-"));
  try { await fn(join(dir, "journal.json")); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

function startHolder(path) {
  const script = `
    import { withExclusiveFileLock } from ${JSON.stringify(lockUrl)};
    await withExclusiveFileLock(process.argv[1], async () => {
      process.stdout.write("LOCKED\\n");
      await new Promise((resolve) => {
        process.stdin.setEncoding("utf8");
        process.stdin.once("data", resolve);
      });
    });
  `;
  return spawn(process.execPath, ["--input-type=module", "-e", script, path], {
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function waitForLocked(child) {
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  await Promise.race([
    new Promise((resolve, reject) => {
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes("LOCKED")) resolve();
      });
      child.once("error", reject);
      child.once("exit", (code) => reject(new Error(`holder exited early: ${code}; ${stderr}`)));
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error("holder readiness timeout")), 10000);
      timer.unref();
    }),
  ]);
}

async function releaseHolder(child) {
  const exit = once(child, "exit");
  child.stdin.write("release\\n");
  child.stdin.end();
  const [code, signal] = await exit;
  expect({ code, signal }).toEqual({ code: 0, signal: null });
}

describe("Hyper XSUS Core — real two-process journal locking", () => {
  it("rejects save while a separate process holds the lock, then retries", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      const holder = startHolder(path);
      try {
        await waitForLocked(holder);
        await expect(store.save([entry(1)])).rejects.toMatchObject({
          code: "XSUS_FILE_LOCK_BUSY",
        });
        await releaseHolder(holder);
        await store.save([entry(1)]);
        expect(await store.load()).toEqual([entry(1)]);
      } finally {
        if (holder.exitCode === null) holder.kill("SIGKILL");
        await store.close();
      }
    });
  }, 20000);

  it("rejects recovery while a separate process holds the lock", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      await store.save([{ id: 1, state: "running", attempted: 1, added: 0 }]);
      const holder = startHolder(path);
      try {
        await waitForLocked(holder);
        await expect(store.recoverInterrupted()).rejects.toMatchObject({
          code: "XSUS_FILE_LOCK_BUSY",
        });
        await releaseHolder(holder);
        expect((await store.recoverInterrupted())[0].state).toBe("interrupted");
      } finally {
        if (holder.exitCode === null) holder.kill("SIGKILL");
        await store.close();
      }
    });
  }, 20000);
});

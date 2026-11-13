import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, access, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const lockUrl = new URL("../../integration/exclusive-file-lock.js", import.meta.url).href;
const entry = (id, state = "completed") => ({
  id, state, attempted: 1, added: state === "completed" ? 1 : 0,
});

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-crash-lock-"));
  const filePath = join(dir, "journal.json");
  const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
  try { await run({ store, filePath }); }
  finally { await store.close(); await rm(dir, { recursive: true, force: true }); }
}

async function killLockHolder(filePath) {
  const script = `
    import { withExclusiveFileLock } from ${JSON.stringify(lockUrl)};
    await withExclusiveFileLock(process.argv[1], async () => {
      process.stdout.write("LOCKED\\n");
      await new Promise(() => {});
    });
  `;
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", script, filePath],
    { stdio: ["ignore", "pipe", "pipe"] });
  let output = "", stderr = "";
  const ready = new Promise((resolve, reject) => {
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (output.includes("LOCKED")) resolve();
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`holder exited ${code}: ${stderr}`)));
  });
  try {
    await Promise.race([
      ready,
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error("holder readiness timeout")), 10000);
        timer.unref();
      }),
    ]);
    child.kill("SIGKILL");
    const code = await new Promise((resolve) => child.once("exit", (_, signal) => resolve(signal)));
    expect(code).toBe("SIGKILL");
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
}

describe("Hyper XSUS Core — crash lock safety boundaries", () => {
  it("keeps committed data intact after a separate lock holder is killed", async () => {
    await fixture(async ({ store, filePath }) => {
      await store.save([entry(1), entry(2)]);
      const before = await readFile(filePath);
      await killLockHolder(filePath);
      expect(await readFile(filePath)).toEqual(before);
      await expect(store.load()).rejects.toMatchObject({ code: "XSUS_FILE_LOCK_BUSY" });
      await expect(access(filePath + ".lock")).resolves.toBeUndefined();
    });
  }, 20000);

  it("does not overwrite committed data when a stale lock exists", async () => {
    await fixture(async ({ store, filePath }) => {
      await store.save([entry(1)]);
      const before = await readFile(filePath);
      await killLockHolder(filePath);
      await expect(store.save([entry(3)])).rejects.toMatchObject({
        code: "XSUS_FILE_LOCK_BUSY",
      });
      expect(await readFile(filePath)).toEqual(before);
    });
  }, 20000);

  it("permits controlled recovery after explicit stale-lock removal", async () => {
    await fixture(async ({ store, filePath }) => {
      await store.save([entry(1, "running"), entry(2)]);
      await killLockHolder(filePath);
      await expect(store.recoverInterrupted()).rejects.toMatchObject({
        code: "XSUS_FILE_LOCK_BUSY",
      });
      // Test-only cleanup: production must verify owner death and ownership.
      await unlink(filePath + ".lock");
      const recovered = await store.recoverInterrupted();
      expect(recovered.map((item) => item.state))
        .toEqual(["interrupted", "completed"]);
      expect(await store.load()).toEqual(recovered);
    });
  }, 20000);
});

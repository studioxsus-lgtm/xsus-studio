import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const snapshotUrl = new URL("../../integration/graph-snapshot.persistence.js", import.meta.url).href;
const journalUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;

async function withDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-sigkill-"));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

async function killAfterReady(script, path) {
  if (process.platform === "win32") return;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script, path], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (part) => { stderr += part; });
  const exited = once(child, "exit");
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        let output = "";
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (part) => {
          output += part;
          if (output.includes("READY")) resolve();
        });
        child.on("error", reject);
        child.on("exit", (code) => reject(new Error(`Child exited before READY: ${code}; ${stderr}`)));
      }),
      new Promise((_, reject) => {
        const timeout = setTimeout(() => reject(new Error("Child readiness timeout")), 10000);
        timeout.unref();
      }),
    ]);
    child.kill("SIGKILL");
    const [code, signal] = await exited;
    expect(signal).toBe("SIGKILL");
    expect(code).toBeNull();
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited;
  }
}

describe.skipIf(process.platform === "win32")("Hyper XSUS Core — forced process termination", () => {
  it("retains a confirmed graph snapshot after SIGKILL", async () => {
    await withDir(async (dir) => {
      const path = join(dir, "graph.json");
      const script = `
        import { createGraphSnapshotStore } from ${JSON.stringify(snapshotUrl)};
        const store = createGraphSnapshotStore({ filePath: process.argv[1] });
        await store.save({ nodes: [{ id: "A" }, { id: "B" }], links: [
          { id: "AB", sourceId: "A", targetId: "B", relationType: "supports" }
        ] });
        process.stdout.write("READY\\n");
        setInterval(() => {}, 1000);
      `;
      await killAfterReady(script, path);
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        expect(await store.load()).toMatchObject({
          nodes: [{ id: "A" }, { id: "B" }],
          links: [{ id: "AB", sourceId: "A", targetId: "B" }],
        });
      } finally { await store.close(); }
    });
  }, 20000);

  it("marks a confirmed running journal entry interrupted after SIGKILL", async () => {
    await withDir(async (dir) => {
      const path = join(dir, "journal.json");
      const script = `
        import { createTransactionJournalStore } from ${JSON.stringify(journalUrl)};
        const store = createTransactionJournalStore({ filePath: process.argv[1] });
        await store.save([{ id: 11, state: "running", attempted: 4, added: 0 }]);
        process.stdout.write("READY\\n");
        setInterval(() => {}, 1000);
      `;
      await killAfterReady(script, path);
      const store = createTransactionJournalStore({ filePath: path });
      try {
        expect((await store.recoverInterrupted())[0]).toMatchObject({
          id: 11, state: "interrupted", attempted: 4,
        });
        expect((await store.load())[0].state).toBe("interrupted");
      } finally { await store.close(); }
    });
  }, 20000);
});

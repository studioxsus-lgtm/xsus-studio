import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-staged-kill-"));
  try { await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

// The child deliberately stages a partially written temporary file using the
// same naming convention as the production stores. It does NOT monkeypatch or
// interrupt the production store's own writeFile/rename implementation.
async function killStagedWriter(primaryPath) {
  const script = `
    import { open } from "node:fs/promises";
    import { basename, dirname, join } from "node:path";
    const target = process.argv[1];
    const temp = join(dirname(target), "." + basename(target) + ".staged-crash.tmp");
    const handle = await open(temp, "wx");
    await handle.write('{"version":"0.1.0","incomplete":');
    await handle.sync();
    process.stdout.write("STAGED\\n");
    setInterval(() => {}, 1000);
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script, primaryPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (data) => { stderr += data.toString(); });
  const exit = once(child, "exit");
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        let output = "";
        child.stdout.on("data", (chunk) => {
          output += chunk.toString();
          if (output.includes("STAGED")) resolve();
        });
        child.on("error", reject);
        child.on("exit", (code) => reject(new Error(`Child exited before staging: ${code} ${stderr}`)));
      }),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error("Staging timed out")), 10000);
        timer.unref();
      }),
    ]);
    expect(child.kill("SIGKILL")).toBe(true);
    const [code, signal] = await exit;
    expect(code).toBeNull();
    expect(signal).toBe("SIGKILL");
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exit;
  }
}

describe.skipIf(process.platform === "win32")("Staged mid-write process termination boundaries", () => {
  it("retains the committed graph snapshot after killing a staged writer", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "graph.json");
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        const committed = { nodes: [{ id: "A" }], links: [] };
        await store.save(committed);
        const before = await readFile(path, "utf8");
        await killStagedWriter(path);
        expect(await readFile(path, "utf8")).toBe(before);
        expect(await store.load()).toEqual(committed);
        expect((await readdir(dir)).some((name) =>
          name.startsWith(`.${basename(path)}.`) && name.endsWith(".tmp"))).toBe(true);
      } finally { await store.close(); }
    });
  }, 20000);

  it("retains the committed journal and recovers interrupted entries", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([{ id: 1, state: "running", attempted: 2, added: 0 }]);
        const before = await readFile(path, "utf8");
        await killStagedWriter(path);
        expect(await readFile(path, "utf8")).toBe(before);
        expect((await store.recoverInterrupted())[0].state).toBe("interrupted");
        expect((await store.load())[0].state).toBe("interrupted");
      } finally { await store.close(); }
    });
  }, 20000);

  it("allows a later graph snapshot commit despite a stranded temporary file", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "graph.json");
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        await store.save({ nodes: [{ id: "A" }], links: [] });
        await killStagedWriter(path);
        await store.save({ nodes: [{ id: "B" }], links: [] });
        expect((await store.load()).nodes).toEqual([{ id: "B" }]);
      } finally { await store.close(); }
    });
  }, 20000);

  it("allows a later journal commit despite a stranded temporary file", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([{ id: 1, state: "completed", attempted: 1, added: 1 }]);
        await killStagedWriter(path);
        await store.save([{ id: 2, state: "completed", attempted: 2, added: 2 }]);
        expect((await store.load())[0].id).toBe(2);
      } finally { await store.close(); }
    });
  }, 20000);
});

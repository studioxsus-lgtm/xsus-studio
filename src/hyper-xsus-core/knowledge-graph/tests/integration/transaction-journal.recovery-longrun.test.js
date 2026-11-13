import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const writerUrl = new URL("../../integration/atomic-json-writer.js", import.meta.url).href;
const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });
const entries = (count) => Array.from({ length: count }, (_, i) => entry(i + 1));

const childCode = [
  'import { rename } from "node:fs/promises";',
  'import { writeAtomicJson } from ' + JSON.stringify(writerUrl) + ';',
  'const [path, phase, count] = process.argv.slice(1);',
  'const entries = Array.from({length:Number(count)}, (_, i) => ({id:i+1,state:"completed",attempted:1,added:1}));',
  'await writeAtomicJson(path, {version:' + JSON.stringify(TRANSACTION_JOURNAL_VERSION) + ',entries}, {',
  '  io: {rename: async (from, to) => {',
  '    if (phase === "before") { process.stdout.write("READY_BEFORE\\n"); await new Promise(() => {}); }',
  '    await rename(from, to);',
  '    if (phase === "after") { process.stdout.write("READY_AFTER\\n"); await new Promise(() => {}); }',
  '  }},',
  '});',
].join("\n");

async function killAtBarrier(path, phase, count) {
  const marker = phase === "before" ? "READY_BEFORE" : "READY_AFTER";
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", childCode, path, phase, String(count)],
    { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  let readyResolve, readyReject, exitResolve;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const exited = new Promise((resolve) => { exitResolve = resolve; });
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    if (stdout.includes(marker)) readyResolve();
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", (error) => { readyReject(error); exitResolve({ error }); });
  child.on("close", (code, signal) => {
    if (!stdout.includes(marker)) readyReject(new Error("Child exited before barrier: " + stderr));
    exitResolve({ code, signal });
  });
  let timer;
  try {
    await Promise.race([
      ready,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Barrier timeout: " + stderr)), 10000);
      }),
    ]);
    expect(child.kill("SIGKILL")).toBe(true);
    expect(await exited).toMatchObject({ signal: "SIGKILL" });
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited;
  }
}

async function readFresh(path) {
  const store = createTransactionJournalStore({ filePath: path });
  try { return await store.load(); } finally { await store.close(); }
}

describe("Hyper XSUS Core — recovery integrity long-run v2.0.0", () => {
  it("maintains exact committed entries across 50 SIGKILL and recovery cycles", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-recovery-longrun-"));
    const path = join(dir, "journal.json");
    try {
      let committed = 1;
      const initial = createTransactionJournalStore({ filePath: path });
      try { await initial.save(entries(committed)); } finally { await initial.close(); }

      for (let cycle = 0; cycle < 50; cycle++) {
        const phase = cycle % 2 === 0 ? "before" : "after";
        await killAtBarrier(path, phase, committed + 1);
        if (phase === "after") committed++;
        expect(await readFresh(path)).toEqual(entries(committed));

        const restarted = createTransactionJournalStore({ filePath: path });
        try {
          committed++;
          await restarted.save(entries(committed));
        } finally { await restarted.close(); }
        expect(await readFresh(path)).toEqual(entries(committed));
      }

      // SIGKILL before rename leaves one orphan temp per such crash.
      // The active journal must remain readable despite these unrelated files.
      expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toHaveLength(25);
      expect(await readFresh(path)).toEqual(entries(committed));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 180000);
});

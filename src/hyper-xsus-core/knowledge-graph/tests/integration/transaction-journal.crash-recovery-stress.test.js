import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const writerUrl = new URL("../../integration/atomic-json-writer.js", import.meta.url).href;
const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });

function source() {
  return [
    'import { rename } from "node:fs/promises";',
    'import { writeAtomicJson } from ' + JSON.stringify(writerUrl) + ';',
    'const [path, phase, count] = process.argv.slice(1);',
    'const entries = Array.from({length: Number(count)}, (_, i) => ({id:i+1,state:"completed",attempted:1,added:1}));',
    'const pause = async (marker) => {',
    '  process.stdout.write(marker + "\\n");',
    '  await new Promise(() => { setInterval(() => {}, 1000); });',
    '};',
    'await writeAtomicJson(path, {version:' + JSON.stringify(TRANSACTION_JOURNAL_VERSION) + ',entries}, {',
    '  io: {rename: async (from, to) => {',
    '    if (phase === "before") await pause("READY_BEFORE");',
    '    await rename(from, to);',
    '    if (phase === "after") await pause("READY_AFTER");',
    '  }},',
    '});',
  ].join("\n");
}

async function crash(path, phase, count) {
  const marker = phase === "before" ? "READY_BEFORE" : "READY_AFTER";
  const child = spawn(process.execPath, ["--input-type=module", "-e", source(), path, phase, String(count)],
    { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", settleReady, failReady, settleExit;
  const ready = new Promise((resolve, reject) => { settleReady = resolve; failReady = reject; });
  const exited = new Promise((resolve) => { settleExit = resolve; });
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    if (stdout.includes(marker)) settleReady();
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", (error) => { failReady(error); settleExit({ error }); });
  child.on("close", (code, signal) => {
    if (!stdout.includes(marker)) failReady(new Error("Child stopped before barrier: " + stderr));
    settleExit({ code, signal });
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

describe("Hyper XSUS Core — crash recovery stress v1.9.0", () => {
  it("survives 10 alternating real SIGKILL crashes, fresh-process reads, and recovery writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-crash-stress-"));
    const path = join(dir, "journal.json");
    try {
      let committed = 1;
      const initial = createTransactionJournalStore({ filePath: path });
      try { await initial.save([entry(1)]); } finally { await initial.close(); }
      for (let cycle = 0; cycle < 10; cycle++) {
        const phase = cycle % 2 === 0 ? "before" : "after";
        await crash(path, phase, committed + 1);
        if (phase === "after") committed++;
        expect(await readFresh(path)).toEqual(
          Array.from({ length: committed }, (_, i) => entry(i + 1)),
        );
        const restarted = createTransactionJournalStore({ filePath: path });
        try {
          committed++;
          await restarted.save(Array.from({ length: committed }, (_, i) => entry(i + 1)));
        } finally { await restarted.close(); }
        expect(await readFresh(path)).toHaveLength(committed);
      }
      // Pre-rename crashes can leave orphan temps; they must never replace committed bytes.
      const leftovers = (await readdir(dir)).filter((name) => name.endsWith(".tmp"));
      expect(leftovers).toHaveLength(5);
      expect(await readFresh(path)).toHaveLength(committed);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 90000);
});

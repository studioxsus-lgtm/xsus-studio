import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomicJson } from "../../integration/atomic-json-writer.js";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const writerUrl = new URL("../../integration/atomic-json-writer.js", import.meta.url).href;
const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });
const snapshot = (ids) => ({ version: TRANSACTION_JOURNAL_VERSION, entries: ids.map(entry) });

function childSource() {
  return [
    'import { rename } from "node:fs/promises";',
    'import { writeAtomicJson } from ' + JSON.stringify(writerUrl) + ';',
    'const [filePath, phase] = process.argv.slice(1);',
    'const entries = [1, 2].map(id => ({ id, state: "completed", attempted: 1, added: 1 }));',
    'const hold = async (marker) => {',
    '  process.stdout.write(marker + "\\n");',
    '  await new Promise(() => {});',
    '};',
    'await writeAtomicJson(filePath, { version: ' + JSON.stringify(TRANSACTION_JOURNAL_VERSION) + ', entries }, {',
    '  io: { rename: async (from, to) => {',
    '    if (phase === "before") await hold("BEFORE_RENAME");',
    '    await rename(from, to);',
    '    if (phase === "after") await hold("AFTER_RENAME");',
    '  } },',
    '});',
  ].join("\n");
}

async function runAndKill(filePath, phase) {
  const marker = phase === "before" ? "BEFORE_RENAME" : "AFTER_RENAME";
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", childSource(), filePath, phase],
    { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  let resolveReady, rejectReady, resolveExit;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const exited = new Promise((resolve) => { resolveExit = resolve; });
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    if (stdout.includes(marker)) resolveReady();
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", (error) => {
    rejectReady(error);
    resolveExit({ error });
  });
  child.on("close", (code, signal) => {
    if (!stdout.includes(marker)) {
      rejectReady(new Error("Child exited before " + marker + ": " + stderr));
    }
    resolveExit({ code, signal });
  });
  let timer;
  try {
    await Promise.race([
      ready,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Crash barrier timeout: " + stderr)), 10000);
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

async function readFresh(filePath) {
  const store = createTransactionJournalStore({ filePath });
  try { return await store.load(); }
  finally { await store.close(); }
}

describe("Hyper XSUS Core — real process crash consistency v1.8.0", () => {
  it.each(["before", "after"])("preserves readable journal across SIGKILL %s rename", async (phase) => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-real-crash-"));
    const filePath = join(dir, "journal.json");
    try {
      await writeAtomicJson(filePath, snapshot([1]));
      await runAndKill(filePath, phase);
      const expected = phase === "before" ? [entry(1)] : [entry(1), entry(2)];
      expect(await readFresh(filePath)).toEqual(expected);
      expect(JSON.parse(await readFile(filePath, "utf8")).entries).toEqual(expected);
      const leftovers = (await readdir(dir)).filter((name) => name.endsWith(".tmp"));
      expect(leftovers).toHaveLength(phase === "before" ? 1 : 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 25000);
});

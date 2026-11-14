import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const atomicUrl = new URL("../../integration/atomic-json-writer.js", import.meta.url).href;
const childCode = [
  'import { writeAtomicJson } from ' + JSON.stringify(atomicUrl) + ';',
  'import { rename as actualRename } from "node:fs/promises";',
  'const [filePath, phase] = process.argv.slice(1);',
  'const entries = [{id:1,state:"interrupted",attempted:4,added:2},{id:2,state:"completed",attempted:3,added:3}];',
  'await writeAtomicJson(filePath, {version:"0.1.0",entries}, {io:{',
  '  rename: async (source,target) => {',
  '    if (phase === "before") { process.stdout.write("CRASH_POINT\\n"); await new Promise(() => { setInterval(() => {}, 1000); }); }',
  '    await actualRename(source,target);',
  '    if (phase === "after") { process.stdout.write("CRASH_POINT\\n"); await new Promise(() => { setInterval(() => {}, 1000); }); }',
  '  }',
  '}});',
].join("\n");

function pauseAtCrashPoint(child) {
  return new Promise((resolve, reject) => {
    let output = "", errors = "", finished = false;
    const timer = setTimeout(() => finish(new Error("Crash-point timeout: " + errors)), 20000);
    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.stderr.off("data", onErrorData);
      child.off("error", onError);
      child.off("close", onClose);
      if (error) reject(error); else resolve();
    }
    function onData(chunk) {
      output += chunk.toString();
      if (output.includes("CRASH_POINT\n")) finish();
    }
    function onErrorData(chunk) { errors += chunk.toString(); }
    function onError(error) { finish(error); }
    function onClose(code, signal) {
      finish(new Error("Child exited before crash point: " + code + "/" + signal + " " + errors));
    }
    child.stdout.on("data", onData);
    child.stderr.on("data", onErrorData);
    child.on("error", onError);
    child.on("close", onClose);
  });
}

describe("Hyper XSUS Core — real atomic-write crash injection v3.3.0", () => {
  for (const phase of ["before", "after"]) {
    it.skipIf(process.platform === "win32")(
      "preserves valid journal and supports recovery after SIGKILL " + phase + " rename",
      async () => {
        const dir = await mkdtemp(join(tmpdir(), "xsus-atomic-crash-v33-"));
        const filePath = join(dir, "journal.json");
        let child;
        try {
          const initial = [
            { id: 1, state: "running", attempted: 4, added: 2 },
            { id: 2, state: "completed", attempted: 3, added: 3 },
          ];
          const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
          try { await store.save(initial); } finally { await store.close(); }
          const originalBytes = await readFile(filePath, "utf8");

          child = spawn(process.execPath,
            ["--input-type=module", "-e", childCode, filePath, phase],
            { stdio: ["ignore", "pipe", "pipe"] });
          await pauseAtCrashPoint(child);
          const stopped = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("SIGKILL timeout")), 15000);
            child.once("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
          });
          expect(child.kill("SIGKILL")).toBe(true);
          expect((await stopped).signal).toBe("SIGKILL");

          const bytes = await readFile(filePath, "utf8");
          const parsed = JSON.parse(bytes);
          expect(parsed.version).toBe(TRANSACTION_JOURNAL_VERSION);
          expect(parsed.entries[1]).toEqual(initial[1]);
          if (phase === "before") {
            expect(bytes).toBe(originalBytes);
            expect(parsed.entries[0].state).toBe("running");
          } else {
            expect(parsed.entries[0].state).toBe("interrupted");
          }

          const restart = createTransactionJournalStore({ filePath, exclusiveLock: true });
          try {
            const recovered = await restart.recoverInterrupted();
            expect(recovered).toEqual([
              { ...initial[0], state: "interrupted" }, initial[1],
            ]);
            const stable = await readFile(filePath, "utf8");
            expect(await restart.recoverInterrupted()).toEqual(recovered);
            expect(await readFile(filePath, "utf8")).toBe(stable);
          } finally { await restart.close(); }
        } finally {
          if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
          await rm(dir, { recursive: true, force: true });
        }
      }, 60000);
  }
});

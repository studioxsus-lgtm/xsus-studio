import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, rename, appendFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const identityUrl = new URL("../../integration/journal-temp-identity.js", import.meta.url).href;
const name = ".journal.json.123e4567-e89b-42d3-a456-426614174000.tmp";
const workerCode = [
  'import { captureJournalTempIdentity, verifyJournalTempIdentity } from ' + JSON.stringify(identityUrl) + ';',
  'const [journal, name] = process.argv.slice(1);',
  'const snapshot = await captureJournalTempIdentity(journal, name);',
  'if (!snapshot) throw new Error("Missing candidate");',
  'process.stdout.write("READY\\n");',
  'for await (const chunk of process.stdin) {',
  '  if (!chunk.toString().includes("VERIFY")) continue;',
  '  const result = await verifyJournalTempIdentity(journal, snapshot);',
  '  process.stdout.write("RESULT:" + JSON.stringify({ matches: result.matches, safeToDeleteAutomatically: result.safeToDeleteAutomatically }) + "\\n");',
  '  break;',
  '}',
].join("\n");

function launchReader(journal) {
  const child = spawn(process.execPath,
    ["--input-type=module", "-e", workerCode, journal, name],
    { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "", settled = false;
  const waitFor = (token) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("Worker timeout: " + errors)), 15000);
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
    function onClose(code, signal) { finish(new Error("Worker closed before " + token + ": " + code + "/" + signal + " " + errors)); }
    child.stdout.on("data", onData);
    child.on("error", onError);
    child.on("close", onClose);
    if (output.includes(token)) finish(null, output);
  });
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  return {
    child,
    ready: waitFor("READY"),
    verify: async () => {
      settled = false;
      const result = waitFor("RESULT:");
      child.stdin.end("VERIFY\n");
      const text = await result;
      const line = text.split("\n").find((item) => item.startsWith("RESULT:"));
      return JSON.parse(line.slice("RESULT:".length));
    },
  };
}

async function scenario(mutate) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-concurrent-identity-"));
  const journal = join(dir, "journal.json");
  const temp = join(dir, name);
  const workers = [];
  try {
    await writeFile(journal, "committed");
    await writeFile(temp, "pending");
    workers.push(launchReader(journal), launchReader(journal));
    await Promise.all(workers.map((worker) => worker.ready));
    await mutate({ dir, temp });
    const results = await Promise.all(workers.map((worker) => worker.verify()));
    expect(results).toEqual([
      { matches: false, safeToDeleteAutomatically: false },
      { matches: false, safeToDeleteAutomatically: false },
    ]);
    expect(await readFile(journal, "utf8")).toBe("committed");
  } finally {
    for (const worker of workers) {
      if (worker.child.exitCode === null && worker.child.signalCode === null) worker.child.kill("SIGKILL");
    }
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Hyper XSUS Core — concurrent identity verification v2.6.0", () => {
  it("two independent readers detect a replacement after their snapshot barriers", async () => {
    await scenario(async ({ dir, temp }) => {
      const replacement = join(dir, "replacement");
      await writeFile(replacement, "replacement");
      await rename(replacement, temp);
    });
  }, 45000);

  it("two independent readers detect a concurrent writer's content growth", async () => {
    await scenario(async ({ temp }) => {
      await appendFile(temp, "-changed");
    });
  }, 45000);
});

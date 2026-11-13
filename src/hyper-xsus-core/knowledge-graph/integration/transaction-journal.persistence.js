/**
 * Hyper XSUS Core — Transaction Journal Persistence v0.1.0
 * Durable journal snapshots for a single writer on a local filesystem.
 * This is not a distributed transaction manager or a durable graph store.
 */
import { readFile, writeFile, rename, mkdir, unlink } from "node:fs/promises";
import { dirname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";

export const TRANSACTION_JOURNAL_VERSION = "0.1.0";
const STATES = new Set(["running", "completed", "failed", "interrupted"]);

function validate(entries) {
  if (!Array.isArray(entries)) throw new TypeError("Journal entries must be an array.");
  const ids = new Set();
  return entries.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
        !Number.isSafeInteger(entry.id) || entry.id < 1 ||
        !STATES.has(entry.state) ||
        !Number.isSafeInteger(entry.attempted) || entry.attempted < 0 ||
        !Number.isSafeInteger(entry.added) || entry.added < 0 ||
        entry.added > entry.attempted ||
        (entry.error !== undefined && typeof entry.error !== "string") ||
        ids.has(entry.id)) {
      throw new TypeError("Invalid transaction journal entry.");
    }
    ids.add(entry.id);
    return { id: entry.id, state: entry.state, attempted: entry.attempted,
      added: entry.added, ...(entry.error === undefined ? {} : { error: entry.error }) };
  });
}

export function createTransactionJournalStore({ filePath }) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError("filePath must be a non-empty string.");
  }
  let queue = Promise.resolve();
  let closed = false;
  const ensureOpen = () => {
    if (closed) throw new Error("Transaction journal store is closed.");
  };

  async function load() {
    ensureOpen();
    await queue;
    let raw;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    const data = JSON.parse(raw);
    if (!data || data.version !== TRANSACTION_JOURNAL_VERSION) {
      throw new TypeError("Unsupported transaction journal version.");
    }
    return validate(data.entries);
  }

  function save(entries) {
    ensureOpen();
    const snapshot = validate(entries);
    const operation = queue.catch(() => {}).then(async () => {
      await mkdir(dirname(filePath), { recursive: true });
      const temp = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`);
      try {
        await writeFile(temp, JSON.stringify({
          version: TRANSACTION_JOURNAL_VERSION, entries: snapshot,
        }), { encoding: "utf8", flag: "wx" });
        await rename(temp, filePath);
      } catch (error) {
        await unlink(temp).catch(() => {});
        throw error;
      }
    });
    queue = operation;
    return operation;
  }

  async function recoverInterrupted() {
    ensureOpen();
    const entries = await load();
    const recovered = entries.map((entry) =>
      entry.state === "running" ? { ...entry, state: "interrupted" } : entry);
    if (recovered.some((entry, i) => entry.state !== entries[i].state)) {
      await save(recovered);
    }
    return recovered;
  }

  async function close() {
    if (closed) return;
    await queue;
    closed = true;
  }

  return Object.freeze({ version: TRANSACTION_JOURNAL_VERSION,
    load, save, recoverInterrupted, close });
}

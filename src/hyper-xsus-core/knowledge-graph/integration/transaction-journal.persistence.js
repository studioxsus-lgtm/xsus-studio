/**
 * Hyper XSUS Core — Transaction Journal Persistence v0.1.0
 * Durable journal snapshots for a single writer on a local filesystem.
 * This is not a distributed transaction manager or a durable graph store.
 */
import { readFile } from "node:fs/promises";
import { writeAtomicJson } from "./atomic-json-writer.js";

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

  async function readCommitted() {
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

  async function load() {
    ensureOpen();
    await queue;
    return readCommitted();
  }

  function save(entries) {
    ensureOpen();
    const snapshot = validate(entries);
    const operation = queue.catch(() => {}).then(async () => {
      await writeAtomicJson(filePath, { version: TRANSACTION_JOURNAL_VERSION, entries: snapshot });
    });
    queue = operation;
    return operation;
  }

  function recoverInterrupted() {
    ensureOpen();
    // The entire read/modify/write transaction runs in the same queue as save.
    // This prevents another save on this store instance from being overwritten
    // by recovery between reading and committing.
    const operation = queue.catch(() => {}).then(async () => {
      const entries = await readCommitted();
      let changed = false;
      const recovered = entries.map((entry) => {
        if (entry.state !== "running") return entry;
        changed = true;
        return { ...entry, state: "interrupted" };
      });
      if (changed) {
        await writeAtomicJson(filePath, {
          version: TRANSACTION_JOURNAL_VERSION, entries: recovered,
        });
      }
      return recovered;
    });
    queue = operation;
    return operation;
  }

  async function close() {
    if (closed) return;
    await queue;
    closed = true;
  }

  return Object.freeze({ version: TRANSACTION_JOURNAL_VERSION,
    load, save, recoverInterrupted, close });
}

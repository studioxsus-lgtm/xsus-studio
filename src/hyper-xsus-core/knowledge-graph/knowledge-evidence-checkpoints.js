/**
 * Hyper XSUS Core — Durable Evidence Checkpoints v1.0.0
 *
 * Storage-agnostic durable checkpoints for the existing evidence ledger.
 * Requires an adapter with atomic compare-and-swap; a plain read/write
 * adapter is intentionally rejected. The trusted head must be retained
 * independently to detect deletion or replacement of complete history.
 *
 * This does not persist governance proposals or graph mutations and is
 * not a distributed transaction. No browser-specific or Node-only APIs.
 */
import {
  createKnowledgeChangeEvidenceLedger,
  restoreKnowledgeChangeEvidenceLedger
} from "./knowledge-change-evidence-ledger.js";
import { sha256Hex } from "./portable-sha256.js";

export const KNOWLEDGE_EVIDENCE_CHECKPOINT_VERSION = "1.0.0";
const GENESIS = "0".repeat(64);
const HASH = /^[0-9a-f]{64}$/;
const isPlain = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function frozen(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) frozen(item);
    Object.freeze(value);
  }
  return value;
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function validateKey(key) {
  if (typeof key !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)) {
    throw new TypeError("checkpoint key must be a safe identifier (1-128 chars).");
  }
  return key;
}
function validateAdapter(adapter) {
  if (!adapter || typeof adapter.read !== "function" ||
      typeof adapter.compareAndSwap !== "function") {
    throw new TypeError("storage must expose read(key) and atomic compareAndSwap(key, expectedRevision, next).");
  }
}
function validCheckpoint(value) {
  if (!isPlain(value) ||
      value.version !== KNOWLEDGE_EVIDENCE_CHECKPOINT_VERSION ||
      !Number.isSafeInteger(value.revision) || value.revision < 1 ||
      typeof value.headHash !== "string" || !HASH.test(value.headHash) ||
      typeof value.previousHeadHash !== "string" || !HASH.test(value.previousHeadHash) ||
      !isPlain(value.snapshot) || !Array.isArray(value.snapshot.records) ||
      value.snapshot.headHash !== value.headHash ||
      value.snapshot.records.length !== value.recordCount ||
      !Number.isSafeInteger(value.recordCount) || value.recordCount < 0 ||
      typeof value.checksum !== "string" || !HASH.test(value.checksum)) {
    throw new Error("Invalid evidence checkpoint.");
  }
  const { checksum, ...body } = value;
  if (sha256Hex(JSON.stringify(body)) !== checksum) {
    throw new Error("Evidence checkpoint checksum mismatch.");
  }
  const recovered = restoreKnowledgeChangeEvidenceLedger(value.snapshot);
  if (!recovered.verify(value.headHash).valid) {
    throw new Error("Evidence checkpoint integrity mismatch.");
  }
  return recovered;
}
function checkpoint(revision, previousHeadHash, ledger) {
  const snapshot = ledger.exportSnapshot();
  const body = {
    version: KNOWLEDGE_EVIDENCE_CHECKPOINT_VERSION,
    revision, previousHeadHash,
    headHash: snapshot.headHash,
    recordCount: snapshot.records.length,
    snapshot
  };
  return frozen({ ...body, checksum: sha256Hex(JSON.stringify(body)) });
}

/**
 * Each checkpoint writes an entire bounded ledger snapshot. For large ledgers
 * a database-backed append-only store is preferable.
 *
 * expectedHeadHash is a separately trusted anchor supplied by the caller.
 * If omitted, storage consistency is checked but rollback/truncation of
 * the complete stored history cannot be detected.
 */
export function createKnowledgeEvidenceCheckpointStore({
  storage, key, maxRecords = 10000
} = {}) {
  validateAdapter(storage);
  validateKey(key);
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 100000) {
    throw new TypeError("maxRecords must be between 1 and 100000.");
  }
  let pending = Promise.resolve();
  function serialize(task) {
    const result = pending.then(task);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }
  async function read() {
    const value = await storage.read(key);
    if (value === null) return null;
    if (!isPlain(value)) throw new Error("Invalid evidence checkpoint.");
    return copy(value);
  }
  async function recover({ expectedHeadHash } = {}) {
    if (expectedHeadHash !== undefined && !HASH.test(expectedHeadHash)) {
      throw new TypeError("Invalid trusted head hash.");
    }
    return serialize(async () => {
      const stored = await read();
      if (stored === null) {
        if (expectedHeadHash !== undefined && expectedHeadHash !== GENESIS) {
          throw new Error("Evidence checkpoint missing for trusted head.");
        }
        return frozen({ revision: 0, headHash: GENESIS,
          ledger: createKnowledgeChangeEvidenceLedger({ maxRecords }) });
      }
      const ledger = validCheckpoint(stored);
      if (expectedHeadHash !== undefined && stored.headHash !== expectedHeadHash) {
        throw new Error("Evidence checkpoint trusted head mismatch.");
      }
      if (stored.recordCount > maxRecords) throw new Error("Evidence capacity exceeded.");
      return frozen({ revision: stored.revision, headHash: stored.headHash, ledger });
    });
  }
  /**
   * Save a ledger only if the caller's revision and head match the stored
   * checkpoint. Rejects forks, truncated history, and conflicting writers.
   */
  async function commit({ ledger, expectedRevision, expectedHeadHash }) {
    if (!ledger || typeof ledger.exportSnapshot !== "function" ||
        typeof ledger.verify !== "function") throw new TypeError("Invalid evidence ledger.");
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new TypeError("Invalid expected revision.");
    }
    if (typeof expectedHeadHash !== "string" || !HASH.test(expectedHeadHash)) {
      throw new TypeError("Invalid expected head hash.");
    }
    return serialize(async () => {
      const current = await read();
      const actualRevision = current === null ? 0 : current.revision;
      const actualHead = current === null ? GENESIS : current.headHash;
      if (current !== null) validCheckpoint(current);
      if (actualRevision !== expectedRevision || actualHead !== expectedHeadHash) {
        throw new Error("Evidence checkpoint conflict.");
      }
      const snapshot = ledger.exportSnapshot();
      const restored = restoreKnowledgeChangeEvidenceLedger(snapshot, { maxRecords });
      const records = restored.exportSnapshot().records;
      const priorRecords = current === null ? [] : current.snapshot.records;
      if (records.length < priorRecords.length ||
          records.slice(0, priorRecords.length).some((item, i) =>
            item.hash !== priorRecords[i].hash)) {
        throw new Error("Evidence checkpoint history fork or truncation.");
      }
      if (records.length === priorRecords.length) {
        if (snapshot.headHash !== actualHead) throw new Error("Evidence checkpoint history fork.");
        return frozen({ revision: actualRevision, headHash: actualHead, unchanged: true });
      }
      const next = checkpoint(actualRevision + 1, actualHead, restored);
      // Adapter must atomically compare revision and replace the record.
      const swapped = await storage.compareAndSwap(key, actualRevision, copy(next));
      if (swapped !== true) throw new Error("Evidence checkpoint concurrent write conflict.");
      return frozen({ revision: next.revision, headHash: next.headHash, unchanged: false });
    });
  }
  return Object.freeze({
    version: KNOWLEDGE_EVIDENCE_CHECKPOINT_VERSION,
    recover, commit
  });
}

/** Test/dev adapter only: volatile and not durable across process restarts. */
export function createInMemoryEvidenceCheckpointAdapter() {
  const data = new Map();
  return Object.freeze({
    async read(key) { return data.has(key) ? copy(data.get(key)) : null; },
    async compareAndSwap(key, expectedRevision, next) {
      const revision = data.has(key) ? data.get(key).revision : 0;
      if (revision !== expectedRevision) return false;
      data.set(key, copy(next));
      return true;
    }
  });
}

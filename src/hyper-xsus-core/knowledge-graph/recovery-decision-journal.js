/**
 * Hyper XSUS Core — Recovery Decision Journal v1.0.0
 * Durable, append-only decision history through injected atomic CAS storage.
 * Does not authenticate identities or authorize anchor changes; the caller
 * must enforce those separately. Hash chain is tamper-evident only with a
 * separately retained trusted head.
 */
import { sha256Hex } from "./portable-sha256.js";
export const RECOVERY_DECISION_JOURNAL_VERSION = "1.0.0";
const HASH = /^[a-f0-9]{64}$/;
const GENESIS = "0".repeat(64);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ACTIONS = new Set(["proposed", "approved", "revoked", "executed", "failed"]);
const copy = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) freeze(v);
    Object.freeze(value);
  }
  return value;
};
function checkRecord(record, index, prior) {
  if (!record || record.sequence !== index + 1 || record.previousHash !== prior ||
      !HASH.test(record.hash) || !ACTIONS.has(record.action) ||
      !ID.test(record.requestId) || !ID.test(record.actorId) ||
      !Number.isSafeInteger(record.timestamp) || record.timestamp < 0) {
    throw new Error("Invalid recovery decision record.");
  }
  const { hash, ...body } = record;
  if (sha256Hex(JSON.stringify(body)) !== hash) throw new Error("Recovery decision hash mismatch.");
}
function verify(snapshot, expectedHeadHash) {
  if (!snapshot || snapshot.version !== RECOVERY_DECISION_JOURNAL_VERSION ||
      !Array.isArray(snapshot.records) || !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision !== snapshot.records.length ||
      !HASH.test(snapshot.headHash)) throw new Error("Invalid recovery journal snapshot.");
  let head = GENESIS;
  snapshot.records.forEach((record, i) => {
    checkRecord(record, i, head);
    head = record.hash;
  });
  if (snapshot.headHash !== head) throw new Error("Recovery journal chain mismatch.");
  if (expectedHeadHash !== undefined && expectedHeadHash !== head) {
    throw new Error("Recovery journal trusted head mismatch.");
  }
  return head;
}
export function createRecoveryDecisionJournal({ storage, key, maxRecords = 10000 } = {}) {
  if (!storage || typeof storage.read !== "function" ||
      typeof storage.compareAndSwap !== "function") {
    throw new TypeError("Atomic recovery journal storage is required.");
  }
  if (typeof key !== "string" || !ID.test(key) ||
      !Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 100000) {
    throw new TypeError("Invalid recovery journal configuration.");
  }
  let pending = Promise.resolve();
  function serial(fn) {
    const result = pending.then(fn);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }
  async function load(expectedHeadHash) {
    const stored = await storage.read(key);
    const snapshot = stored === null
      ? { version: RECOVERY_DECISION_JOURNAL_VERSION, revision: 0, headHash: GENESIS, records: [] }
      : copy(stored);
    verify(snapshot, expectedHeadHash);
    if (snapshot.records.length > maxRecords) throw new Error("Recovery journal capacity exceeded.");
    return snapshot;
  }
  async function inspect({ expectedHeadHash } = {}) {
    return serial(async () => {
      const snapshot = await load(expectedHeadHash);
      return freeze(copy(snapshot));
    });
  }
  async function append({ requestId, actorId, action, timestamp, expectedHeadHash }) {
    if (!ID.test(requestId) || !ID.test(actorId) || !ACTIONS.has(action) ||
        !Number.isSafeInteger(timestamp) || timestamp < 0 ||
        (expectedHeadHash !== undefined && !HASH.test(expectedHeadHash))) {
      throw new TypeError("Invalid recovery journal event.");
    }
    return serial(async () => {
      const current = await load(expectedHeadHash);
      if (current.revision >= maxRecords) throw new Error("Recovery journal capacity exceeded.");
      const body = {
        sequence: current.revision + 1, previousHash: current.headHash,
        requestId, actorId, action, timestamp
      };
      const record = { ...body, hash: sha256Hex(JSON.stringify(body)) };
      const next = {
        version: RECOVERY_DECISION_JOURNAL_VERSION, revision: body.sequence,
        headHash: record.hash, records: [...current.records, record]
      };
      const saved = await storage.compareAndSwap(key, current.revision, copy(next));
      if (saved !== true) throw new Error("Recovery journal concurrent write conflict.");
      return freeze({ record: copy(record), revision: next.revision, headHash: next.headHash });
    });
  }
  return freeze({ version: RECOVERY_DECISION_JOURNAL_VERSION, inspect, append });
}

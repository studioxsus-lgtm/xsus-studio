/**
 * Hyper XSUS Core — Knowledge Change Evidence Ledger v1.0.0
 *
 * Append-only, SHA-256 hash-chained event records, export/import and integrity
 * verification. Integrity detects accidental/unauthorized edits only when
 * the trusted head hash is retained separately; this is NOT a signature.
 * No automatic persistence or identity authentication is provided.
 */
import { createHash } from "node:crypto";

export const KNOWLEDGE_CHANGE_EVIDENCE_VERSION = "1.0.0";
const GENESIS = "0".repeat(64);
const ALLOWED = new Set(["proposed", "approved", "rejected", "blocked", "stale", "executed"]);

function isPlain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function canonical(value, stack = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || stack.has(value) || (!Array.isArray(value) && !isPlain(value))) {
    throw new TypeError("Evidence payload must contain JSON-compatible values.");
  }
  stack.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length ||
        !Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i)).every(Boolean)) {
      throw new TypeError("Evidence payload arrays must be dense.");
    }
    result = value.map(item => canonical(item, stack));
  } else {
    result = {};
    for (const key of Object.keys(value).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError("Evidence payload must not contain accessors.");
      }
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new TypeError("Forbidden evidence payload key.");
      }
      result[key] = canonical(descriptor.value, stack);
    }
    if (Reflect.ownKeys(value).length !== Object.keys(value).length) {
      throw new TypeError("Evidence payload must not contain symbol keys.");
    }
  }
  stack.delete(value);
  return result;
}
function frozen(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) frozen(v);
    Object.freeze(value);
  }
  return value;
}
function validId(value, name) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > 256) {
    throw new TypeError(name + " must be a trimmed non-empty string of at most 256 characters.");
  }
  return value;
}
function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value)), "utf8").digest("hex");
}
function makeRecord(sequence, previousHash, event) {
  const body = { sequence, previousHash, event: canonical(event) };
  return frozen({ ...body, hash: digest(body) });
}
function verifyRecords(records, expectedHeadHash) {
  if (!Array.isArray(records)) return { valid: false, error: "INVALID_RECORDS" };
  let previousHash = GENESIS;
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    try {
      if (!isPlain(record) || Object.keys(record).sort().join(",") !==
          "event,hash,previousHash,sequence" || record.sequence !== i + 1 ||
          record.previousHash !== previousHash ||
          !isPlain(record.event) || !ALLOWED.has(record.event.action) ||
          !Number.isInteger(record.event.timestamp) || record.event.timestamp < 0 ||
          typeof record.hash !== "string" || !/^[0-9a-f]{64}$/.test(record.hash) ||
          !validId(record.event.proposalId, "proposalId") ||
          !validId(record.event.actorId, "actorId") ||
          record.hash !== digest({
            sequence: record.sequence, previousHash: record.previousHash, event: record.event
          })) {
        return { valid: false, error: "INVALID_RECORD", sequence: i + 1 };
      }
    } catch {
      return { valid: false, error: "INVALID_RECORD", sequence: i + 1 };
    }
    previousHash = record.hash;
  }
  if (expectedHeadHash !== undefined && previousHash !== expectedHeadHash) {
    return { valid: false, error: "HEAD_MISMATCH" };
  }
  return { valid: true, count: records.length, headHash: previousHash };
}

export function verifyKnowledgeChangeEvidence(records, { expectedHeadHash } = {}) {
  return frozen(verifyRecords(records, expectedHeadHash));
}

export function createKnowledgeChangeEvidenceLedger({
  maxRecords = 10000, initialRecords = [], expectedHeadHash
} = {}) {
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 100000) {
    throw new TypeError("maxRecords must be between 1 and 100000.");
  }
  const verified = verifyRecords(initialRecords, expectedHeadHash);
  if (!verified.valid) throw new Error("Evidence recovery failed: " + verified.error);
  if (initialRecords.length > maxRecords) throw new Error("Evidence capacity exceeded.");
  let records = initialRecords.map(record => makeRecord(
    record.sequence, record.previousHash, record.event
  ));
  const seen = new Set(records.map(record => record.event.proposalId + "\u0000" +
    record.event.action + "\u0000" + record.event.actorId + "\u0000" + record.event.timestamp));

  function append({ proposalId, actorId, action, timestamp, details = {} }) {
    validId(proposalId, "proposalId");
    validId(actorId, "actorId");
    if (!ALLOWED.has(action)) throw new TypeError("Unsupported evidence action.");
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("timestamp must be a non-negative safe integer.");
    }
    if (!isPlain(details)) throw new TypeError("details must be a plain object.");
    const event = canonical({ proposalId, actorId, action, timestamp, details });
    const key = proposalId + "\u0000" + action + "\u0000" + actorId + "\u0000" + timestamp;
    if (seen.has(key)) throw new Error("Duplicate evidence event.");
    if (records.length >= maxRecords) throw new Error("Evidence capacity exceeded.");
    const previousHash = records.length ? records[records.length - 1].hash : GENESIS;
    const record = makeRecord(records.length + 1, previousHash, event);
    records.push(record);
    seen.add(key);
    return record;
  }
  function verify(expectedHeadHash) {
    return frozen(verifyRecords(records, expectedHeadHash));
  }
  function exportSnapshot() {
    return frozen({
      version: KNOWLEDGE_CHANGE_EVIDENCE_VERSION,
      records: records.map(record => canonical(record)),
      headHash: records.length ? records[records.length - 1].hash : GENESIS
    });
  }
  function list({ proposalId, limit = 100 } = {}) {
    if (proposalId !== undefined) validId(proposalId, "proposalId");
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      throw new TypeError("limit must be between 1 and 10000.");
    }
    return frozen(records.filter(record =>
      proposalId === undefined || record.event.proposalId === proposalId
    ).slice(-limit));
  }
  return Object.freeze({
    version: KNOWLEDGE_CHANGE_EVIDENCE_VERSION,
    append, verify, exportSnapshot, list,
    get count() { return records.length; },
    get headHash() { return records.length ? records[records.length - 1].hash : GENESIS; }
  });
}

export function restoreKnowledgeChangeEvidenceLedger(snapshot, options = {}) {
  if (!isPlain(snapshot) || snapshot.version !== KNOWLEDGE_CHANGE_EVIDENCE_VERSION ||
      !Array.isArray(snapshot.records) || typeof snapshot.headHash !== "string") {
    throw new TypeError("Invalid evidence snapshot.");
  }
  const verified = verifyRecords(snapshot.records, snapshot.headHash);
  if (!verified.valid) throw new Error("Evidence recovery failed: " + verified.error);
  return createKnowledgeChangeEvidenceLedger({
    ...options, initialRecords: snapshot.records, expectedHeadHash: snapshot.headHash
  });
}

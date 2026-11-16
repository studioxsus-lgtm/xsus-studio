/**
 * Hyper XSUS Core — Backend Evidence Runtime v1.0.0
 *
 * Server-side composition for Render/Node backends. Requires an injected
 * trusted Supabase client and independently managed head-anchor provider.
 * No credentials, HTTP routes, or database migrations are applied here.
 *
 * Concurrent writers are reconciled through CAS retries. Never silently
 * reset an existing ledger on a failed recovery.
 */
import { createSupabaseEvidenceCheckpointAdapter } from "./supabase-evidence-checkpoint-adapter.js";
import { createKnowledgeEvidenceCheckpointStore } from "./knowledge-evidence-checkpoints.js";

export const KNOWLEDGE_EVIDENCE_BACKEND_VERSION = "1.0.0";
const GENESIS = "0".repeat(64);
const HASH = /^[0-9a-f]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function createKnowledgeEvidenceBackendRuntime({
  supabaseClient, key, anchor, maxRecords = 10000, maxAttempts = 3
} = {}) {
  if (!anchor || typeof anchor.read !== "function" || typeof anchor.advance !== "function") {
    throw new TypeError("A separately trusted head anchor with read() and advance() is required.");
  }
  if (typeof key !== "string" || !IDENTIFIER.test(key)) {
    throw new TypeError("Invalid evidence runtime key.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new TypeError("maxAttempts must be between 1 and 10.");
  }
  const storage = createSupabaseEvidenceCheckpointAdapter({ client: supabaseClient });
  const store = createKnowledgeEvidenceCheckpointStore({ storage, key, maxRecords });
  let queue = Promise.resolve();
  let stopped = false;
  function serialize(fn) {
    const result = queue.then(() => {
      if (stopped) throw new Error("Evidence runtime is closed.");
      return fn();
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  async function trustedHead() {
    const head = await anchor.read(key);
    if (head === null) return GENESIS;
    if (typeof head !== "string" || !HASH.test(head)) {
      throw new Error("Invalid trusted evidence anchor.");
    }
    return head;
  }
  async function verifiedState() {
    const head = await trustedHead();
    // If the independently trusted anchor lags after a successful CAS,
    // refuse to proceed rather than treating the discrepancy as empty state.
    return store.recover({ expectedHeadHash: head });
  }
  async function initialize() {
    return serialize(async () => {
      const state = await verifiedState();
      return Object.freeze({
        revision: state.revision, headHash: state.headHash,
        recordCount: state.ledger.count
      });
    });
  }
  async function append(event) {
    return serialize(async () => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const state = await verifiedState();
        const record = state.ledger.append(event);
        try {
          const saved = await store.commit({
            ledger: state.ledger, expectedRevision: state.revision,
            expectedHeadHash: state.headHash
          });
          // This is not atomic with the DB write. If advance fails,
          // the next operation must fail closed until manual reconciliation.
          await anchor.advance(key, state.headHash, saved.headHash);
          return Object.freeze({
            record, revision: saved.revision, headHash: saved.headHash
          });
        } catch (error) {
          if (!/checkpoint (?:concurrent write )?conflict/.test(error.message) ||
              attempt === maxAttempts) throw error;
          // Another writer may have advanced the checkpoint before its
          // anchor. Retrying will fail closed until the anchor catches up.
        }
      }
      throw new Error("Evidence retry limit exceeded.");
    });
  }
  async function inspect() {
    return serialize(async () => {
      const state = await verifiedState();
      return Object.freeze({
        revision: state.revision, headHash: state.headHash,
        recordCount: state.ledger.count,
        integrity: state.ledger.verify(state.headHash)
      });
    });
  }
  function close() { stopped = true; }
  return Object.freeze({
    version: KNOWLEDGE_EVIDENCE_BACKEND_VERSION,
    initialize, append, inspect, close
  });
}

/**
 * Hyper XSUS Core — Recovery Audit Snapshot Session v1.0.0
 * Consistent, bounded audit pagination across a single immutable persisted
 * state revision. The caller supplies a stable tenant-scoped state adapter.
 * A revision change invalidates the session rather than silently mixing
 * pages. No writes, retries, repairs, or implicit authorization.
 */
export const RECOVERY_AUDIT_SNAPSHOT_SESSION_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STATES = new Set(["pending", "approved", "executing", "executed", "failed", "revoked"]);
function freezeRecord(x) { return Object.freeze(x); }
export function createRecoveryAuditSnapshotSession({
  state, reconciliation, authorize, clock = () => Date.now(),
  maxRecords = 1000, maxPageSize = 100, evidenceGate = null, evidenceKey = null
} = {}) {
  if (!state || typeof state.snapshot !== "function" ||
      !reconciliation || typeof reconciliation.inspect !== "function" ||
      typeof authorize !== "function" || typeof clock !== "function" ||
      !Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > 10000 ||
      !Number.isSafeInteger(maxPageSize) || maxPageSize < 1 || maxPageSize > maxRecords ||
      (evidenceGate !== null && (typeof evidenceGate.begin !== "function" ||
        typeof evidenceGate.verify !== "function" ||
        typeof evidenceKey !== "string" || !ID.test(evidenceKey)))) {
    throw new TypeError("Invalid recovery audit snapshot session configuration.");
  }
  let session = null;
  function now() {
    const t = clock();
    if (!Number.isSafeInteger(t) || t < 0) throw new TypeError("Invalid recovery audit clock.");
    return t;
  }
  async function readSnapshot() {
    const s = await state.snapshot();
    if (!s || !Number.isSafeInteger(s.revision) || s.revision < 0 ||
        !s.requests || typeof s.requests !== "object" || Array.isArray(s.requests)) {
      throw new Error("Invalid recovery audit snapshot.");
    }
    const ids = Object.keys(s.requests).sort();
    if (ids.length > maxRecords || ids.some(id =>
      !ID.test(id) || s.requests[id]?.id !== id ||
      typeof s.requests[id].key !== "string" || !ID.test(s.requests[id].key) ||
      !STATES.has(s.requests[id].status))) {
      throw new Error("Recovery audit snapshot exceeds bounds or contains invalid records.");
    }
    return { revision: s.revision, ids, requests: s.requests };
  }
  async function begin({ actorId } = {}) {
    if (typeof actorId !== "string" || !ID.test(actorId)) {
      throw new TypeError("Invalid recovery audit actor.");
    }
    if (await authorize({ action: "audit", actorId }) !== true) {
      throw new Error("Recovery audit access denied.");
    }
    const snapshot = await readSnapshot();
    const startedAt = now();
    const evidence = evidenceGate ? await evidenceGate.begin({ key: evidenceKey, actorId }) : null;
    // Fail closed if state changed while the independent evidence was pinned.
    if (evidence && evidence.stateRevision !== snapshot.revision) {
      const error = new Error("Recovery audit snapshot changed during initialization.");
      error.code = "RECOVERY_AUDIT_REVISION_CHANGED";
      throw error;
    }
    // No mutable external snapshot is retained; only identifiers and revision.
    session = Object.freeze({
      actorId, revision: snapshot.revision,
      ids: Object.freeze([...snapshot.ids]), startedAt, evidence
    });
    return freezeRecord({
      version: RECOVERY_AUDIT_SNAPSHOT_SESSION_VERSION,
      revision: session.revision, total: session.ids.length, startedAt
    });
  }
  async function page({ actorId, offset = 0, limit = maxPageSize } = {}) {
    if (!session) throw new Error("Recovery audit session not started.");
    if (typeof actorId !== "string" || actorId !== session.actorId ||
        !Number.isSafeInteger(offset) || offset < 0 ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > maxPageSize) {
      throw new TypeError("Invalid recovery audit page request.");
    }
    if (await authorize({ action: "audit", actorId }) !== true) {
      throw new Error("Recovery audit access denied.");
    }
    if (evidenceGate) await evidenceGate.verify({ baseline: session.evidence, actorId });
    const snapshot = await readSnapshot();
    if (snapshot.revision !== session.revision ||
        snapshot.ids.length !== session.ids.length ||
        snapshot.ids.some((id, i) => id !== session.ids[i])) {
      session = null;
      const error = new Error("Recovery audit snapshot changed; restart required.");
      error.code = "RECOVERY_AUDIT_REVISION_CHANGED";
      throw error;
    }
    const ids = session.ids.slice(offset, offset + limit);
    const records = [];
    for (const id of ids) {
      const request = snapshot.requests[id];
      let assessment;
      try { assessment = await reconciliation.inspect({ id }); }
      catch { assessment = { status: "unavailable", reason: "inspection-failed" }; }
      const status = ["consistent", "reconcile", "inconsistent", "unavailable", "invalid", "missing"]
        .includes(assessment?.status) ? assessment.status : "unavailable";
      records.push(freezeRecord({
        id, key: request.key, persistedStatus: request.status,
        assessment: status, reason: typeof assessment?.reason === "string"
          ? assessment.reason.slice(0, 128) : "unknown",
        safeToRetry: false
      }));
    }
    // Recheck revision after potentially slow inspection to avoid mixed pages.
    const after = await readSnapshot();
    if (evidenceGate) await evidenceGate.verify({ baseline: session.evidence, actorId });
    if (after.revision !== session.revision) {
      session = null;
      const error = new Error("Recovery audit snapshot changed during inspection.");
      error.code = "RECOVERY_AUDIT_REVISION_CHANGED";
      throw error;
    }
    return freezeRecord({
      version: RECOVERY_AUDIT_SNAPSHOT_SESSION_VERSION,
      revision: session.revision,
      records: Object.freeze(records),
      nextOffset: offset + ids.length < session.ids.length ? offset + ids.length : null,
      total: session.ids.length, readOnly: true
    });
  }
  return freezeRecord({ version: RECOVERY_AUDIT_SNAPSHOT_SESSION_VERSION, begin, page });
}

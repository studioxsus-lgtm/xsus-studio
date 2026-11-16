/**
 * Hyper XSUS Core — Recovery Restart Audit Engine v1.0.0
 * Bounded, read-only recovery sweep across persisted requests after restart.
 * It does not retry anchor mutations, repair journals or finalize state.
 * Caller must authorize the sweep and provide a trusted, tenant-scoped list.
 */
export const RECOVERY_RESTART_AUDIT_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STATES = new Set(["pending", "approved", "executing", "executed", "failed", "revoked"]);
const freeze = value => Object.freeze(value);
export function createRecoveryRestartAuditEngine({
  state, reconciliation, authorize, clock = () => Date.now(), maxBatch = 100
} = {}) {
  if (!state || typeof state.snapshot !== "function" ||
      !reconciliation || typeof reconciliation.inspect !== "function" ||
      typeof authorize !== "function" || typeof clock !== "function" ||
      !Number.isSafeInteger(maxBatch) || maxBatch < 1 || maxBatch > 1000) {
    throw new TypeError("Recovery restart audit requires state, reconciliation, authorization and valid limits.");
  }
  async function scan({ actorId, cursor = null, limit = maxBatch } = {}) {
    if (typeof actorId !== "string" || !ID.test(actorId) ||
        (cursor !== null && (typeof cursor !== "string" || !ID.test(cursor))) ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > maxBatch) {
      throw new TypeError("Invalid recovery restart audit request.");
    }
    if (await authorize({ action: "audit", actorId }) !== true) {
      throw new Error("Recovery restart audit access denied.");
    }
    const timestamp = clock();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("Invalid recovery audit timestamp.");
    }
    const snapshot = await state.snapshot();
    if (!snapshot || !snapshot.requests || typeof snapshot.requests !== "object" ||
        Array.isArray(snapshot.requests) || !Number.isSafeInteger(snapshot.revision)) {
      throw new Error("Invalid recovery audit snapshot.");
    }
    const ids = Object.keys(snapshot.requests).sort();
    if (ids.some(id => !ID.test(id) || snapshot.requests[id]?.id !== id ||
        !STATES.has(snapshot.requests[id].status))) {
      throw new Error("Invalid recovery audit request state.");
    }
    const start = cursor === null ? 0 : ids.findIndex(id => id > cursor);
    const index = start === -1 ? ids.length : start;
    const selected = ids.slice(index, index + limit);
    const records = [];
    for (const id of selected) {
      const request = snapshot.requests[id];
      let outcome;
      try {
        outcome = await reconciliation.inspect({ id });
      } catch {
        outcome = { status: "unavailable", reason: "reconciliation-error", safeToRetry: false };
      }
      if (!outcome || !["consistent", "reconcile", "inconsistent", "unavailable", "invalid", "missing"].includes(outcome.status)) {
        outcome = { status: "unavailable", reason: "invalid-reconciliation-result", safeToRetry: false };
      }
      records.push(freeze({
        id, key: request.key, persistedStatus: request.status,
        assessment: outcome.status, reason: outcome.reason ?? "unknown",
        safeToRetry: false
      }));
    }
    const counts = {};
    for (const entry of records) counts[entry.assessment] = (counts[entry.assessment] ?? 0) + 1;
    return freeze({
      version: RECOVERY_RESTART_AUDIT_VERSION,
      revision: snapshot.revision, timestamp,
      records: freeze(records),
      counts: freeze(counts),
      nextCursor: index + selected.length < ids.length ? selected.at(-1) : null,
      total: ids.length,
      readOnly: true
    });
  }
  return freeze({ version: RECOVERY_RESTART_AUDIT_VERSION, scan });
}

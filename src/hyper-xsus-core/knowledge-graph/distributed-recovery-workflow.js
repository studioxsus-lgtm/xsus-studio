/**
 * Hyper XSUS Core — Distributed Recovery Workflow v1.0.0
 * Durable recovery requests and cross-instance execution coordination.
 * The injected fencedAnchor.compareAndSwap MUST atomically enforce fencing
 * tokens at the anchor resource. This module is server-only composition.
 * Authentication and independent commit proof verification are injected.
 *
 * No automatic retries after an attempted anchor write: any ambiguous result
 * requires manual reconciliation against the durable journal and anchor.
 */
export const DISTRIBUTED_RECOVERY_WORKFLOW_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const freeze = x => Object.freeze(x);

export function createDistributedRecoveryWorkflow({
  state, lease, inspector, fencedAnchor, journal, authorize, verifyCommitProof,
  workerId, clock = () => Date.now()
} = {}) {
  if (!state || typeof state.propose !== "function" ||
      typeof state.transition !== "function" || typeof state.get !== "function" ||
      !lease || typeof lease.acquire !== "function" || typeof lease.release !== "function" ||
      typeof lease.inspect !== "function" ||
      !inspector || typeof inspector.inspect !== "function" ||
      !fencedAnchor || typeof fencedAnchor.compareAndSwap !== "function" ||
      !journal || typeof journal.append !== "function" ||
      typeof authorize !== "function" || typeof verifyCommitProof !== "function" ||
      typeof workerId !== "string" || !ID.test(workerId) || typeof clock !== "function") {
    throw new TypeError("Invalid distributed recovery workflow dependencies.");
  }
  async function permit(action, actorId, key) {
    if (typeof actorId !== "string" || !ID.test(actorId) ||
        await authorize({ action, actorId, key }) !== true) {
      throw new Error("Distributed recovery access denied.");
    }
  }
  function timestamp() {
    const value = clock();
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Invalid recovery timestamp.");
    return value;
  }
  async function audit(record, actorId, action) {
    try {
      return await journal.append({
        requestId: record.id, actorId, action, timestamp: timestamp()
      });
    } catch {
      const error = new Error("Recovery journal unavailable; manual reconciliation required.");
      error.code = "RECOVERY_JOURNAL_FAILURE";
      throw error;
    }
  }
  async function verifyState(record) {
    const report = await inspector.inspect(record.key);
    if (report.status !== "possible-interrupted-anchor-update" ||
        report.safeToWrite !== false ||
        report.trustedHead !== record.trustedHead ||
        report.checkpointHead !== record.checkpointHead) {
      throw new Error("Recovery checkpoint changed; reconciliation required.");
    }
  }
  async function propose({ id, key, actorId, trustedHead, checkpointHead, proof }) {
    await permit("propose", actorId, key);
    const record = { id, key, trustedHead, checkpointHead };
    await verifyState(record);
    if (await verifyCommitProof({ key, trustedHead, checkpointHead, proof }) !== true) {
      throw new Error("Independent recovery proof rejected.");
    }
    const saved = await state.propose({
      id, requestKey: key, proposer: actorId, trustedHead, checkpointHead
    });
    await audit(saved, actorId, "proposed");
    return saved;
  }
  async function approve({ id, actorId }) {
    const current = await state.get(id);
    if (!current) throw new Error("Recovery request not found.");
    await permit("approve", actorId, current.key);
    if (current.proposer === actorId) throw new Error("Independent recovery approver required.");
    await verifyState(current);
    const updated = await state.transition({
      id, actorId, expectedStatus: "pending", nextStatus: "approved"
    });
    await audit(updated, actorId, "approved");
    return updated;
  }
  async function execute({ id, actorId, proof }) {
    const current = await state.get(id);
    if (!current) throw new Error("Recovery request not found.");
    await permit("execute", actorId, current.key);
    if (current.status !== "approved" ||
        !current.approvedBy || current.approvedBy === current.proposer) {
      throw new Error("Recovery request not approved.");
    }
    // All execution paths require the lease and a fenced anchor.
    const acquired = await lease.acquire(workerId);
    if (!acquired) throw new Error("Distributed recovery lease unavailable.");
    let attempted = false;
    try {
      const fresh = await state.get(id);
      if (!fresh || fresh.status !== "approved" ||
          fresh.trustedHead !== current.trustedHead ||
          fresh.checkpointHead !== current.checkpointHead) {
        throw new Error("Recovery decision changed during execution.");
      }
      await verifyState(fresh);
      if (await verifyCommitProof({
        key: fresh.key, trustedHead: fresh.trustedHead,
        checkpointHead: fresh.checkpointHead, proof
      }) !== true) throw new Error("Independent recovery proof rejected.");
      const liveLease = await lease.inspect();
      if (liveLease.owner !== workerId ||
          liveLease.fencingToken !== acquired.fencingToken ||
          liveLease.expiresAt <= timestamp()) {
        throw new Error("Recovery lease expired or ownership changed.");
      }
      // Durable reservation prevents another process from reusing approval.
      await state.transition({
        id, actorId, expectedStatus: "approved", nextStatus: "failed"
      });
      attempted = true;
      const advanced = await fencedAnchor.compareAndSwap({
        key: fresh.key, expectedHead: fresh.trustedHead,
        nextHead: fresh.checkpointHead, fencingToken: acquired.fencingToken
      });
      if (advanced !== true) throw new Error("Fenced recovery anchor CAS rejected.");
      await audit(fresh, actorId, "executed");
      // Terminal "failed" is a reservation/needs-reconciliation marker.
      // The state engine cannot transition failed->executed; record success
      // in the durable journal and require a verified reconciliation process.
      return freeze({
        status: "anchor-advanced-reconciliation-required", id,
        key: fresh.key, fencingToken: acquired.fencingToken
      });
    } catch (cause) {
      if (attempted) {
        const error = new Error("Recovery execution outcome requires manual reconciliation.");
        error.code = "RECOVERY_RECONCILIATION_REQUIRED";
        throw error;
      }
      throw cause;
    } finally {
      try { await lease.release(workerId, acquired.fencingToken); }
      catch { /* lease expiry is safe only with downstream fencing enforcement */ }
    }
  }
  async function inspect({ id, actorId }) {
    const record = await state.get(id);
    if (!record) throw new Error("Recovery request not found.");
    await permit("read", actorId, record.key);
    return record;
  }
  return freeze({
    version: DISTRIBUTED_RECOVERY_WORKFLOW_VERSION,
    propose, approve, execute, inspect
  });
}

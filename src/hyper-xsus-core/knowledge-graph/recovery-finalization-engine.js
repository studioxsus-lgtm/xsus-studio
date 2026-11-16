/**
 * Hyper XSUS Core — Recovery Finalization Engine v1.0.0
 * Finalizes an already committed anchor update ONLY when the verified
 * journal contains its executed event. Never advances anchor or fabricates
 * evidence. Requires a distributed lease and fresh, matching state.
 *
 * Authorization and authentication are supplied by a trusted backend.
 * This is not a substitute for a durable independent journal trust anchor.
 */
export const RECOVERY_FINALIZATION_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createRecoveryFinalizationEngine({
  reconciliation, state, lease, authorize, workerId
} = {}) {
  if (!reconciliation || typeof reconciliation.inspect !== "function" ||
      !state || typeof state.get !== "function" || typeof state.transition !== "function" ||
      !lease || typeof lease.acquire !== "function" ||
      typeof lease.release !== "function" ||
      typeof authorize !== "function" || typeof workerId !== "string" || !ID.test(workerId)) {
    throw new TypeError("Recovery finalization requires reconciliation, state, lease and authorization.");
  }
  async function finalize({ id, actorId } = {}) {
    if (typeof id !== "string" || !ID.test(id) ||
        typeof actorId !== "string" || !ID.test(actorId)) {
      throw new TypeError("Invalid recovery finalization request.");
    }
    const current = await state.get(id);
    if (!current) throw new Error("Recovery finalization request not found.");
    if (await authorize({ action: "finalize", actorId, key: current.key, id }) !== true) {
      throw new Error("Recovery finalization access denied.");
    }
    const acquired = await lease.acquire(workerId);
    if (!acquired) throw new Error("Recovery finalization lease unavailable.");
    try {
      const fresh = await state.get(id);
      if (!fresh || fresh.status !== "executing" ||
          fresh.key !== current.key || fresh.trustedHead !== current.trustedHead ||
          fresh.checkpointHead !== current.checkpointHead) {
        throw new Error("Recovery finalization state changed.");
      }
      const report = await reconciliation.inspect({ id });
      if (report.status !== "reconcile" ||
          report.reason !== "state-finalization-pending" ||
          report.safeToRetry !== false) {
        throw new Error("Recovery finalization requires verified executed evidence.");
      }
      const finalized = await state.transition({
        id, actorId, expectedStatus: "executing", nextStatus: "executed"
      });
      return Object.freeze({ status: "executed", id, key: finalized.key });
    } finally {
      // Release failure must not undo a successful CAS state transition.
      try { await lease.release(workerId, acquired.fencingToken); } catch {}
    }
  }
  return Object.freeze({ version: RECOVERY_FINALIZATION_VERSION, finalize });
}

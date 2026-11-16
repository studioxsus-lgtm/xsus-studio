/**
 * Hyper XSUS Core — Authorized Anchor Recovery Executor v1.0.0
 * Executes an explicitly approved recovery only after fresh state,
 * independent commit-proof, and authorization checks. Uses an atomic
 * compare-and-swap anchor adapter; never writes a checkpoint or graph.
 *
 * Execution is NOT atomic with the decision journal. On journal failure
 * after a successful anchor CAS, report partial completion for operator
 * reconciliation rather than claiming rollback.
 */
export const ANCHOR_RECOVERY_EXECUTOR_VERSION = "1.0.0";
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const freeze = value => Object.freeze(value);
export function createAuthorizedAnchorRecoveryExecutor({
  decisions, inspector, anchor, verifyCommitProof, authorize, journal, clock = () => Date.now()
} = {}) {
  if (!decisions || typeof decisions.get !== "function" ||
      !inspector || typeof inspector.inspect !== "function" ||
      !anchor || typeof anchor.compareAndSwap !== "function" ||
      typeof verifyCommitProof !== "function" || typeof authorize !== "function" ||
      !journal || typeof journal.append !== "function" ||
      typeof clock !== "function") {
    throw new TypeError("Recovery executor requires decisions, inspector, CAS anchor, proof, authorization, journal and clock.");
  }
  const attempted = new Set();
  let queue = Promise.resolve();
  function serial(fn) {
    const result = queue.then(fn);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  async function execute({ id, actorId, proof }) {
    return serial(async () => {
      if (typeof id !== "string" || !ID.test(id) ||
          typeof actorId !== "string" || !ID.test(actorId)) {
        throw new TypeError("Invalid recovery execution identity.");
      }
      const decision = await decisions.get({ id, actorId });
      if (!decision || decision.id !== id || decision.status !== "approved" ||
          typeof decision.key !== "string" || !ID.test(decision.key) ||
          !HASH.test(decision.trustedHead) || !HASH.test(decision.checkpointHead) ||
          decision.trustedHead === decision.checkpointHead ||
          decision.approvedBy === decision.proposer) {
        throw new Error("Recovery decision is not eligible for execution.");
      }
      if (attempted.has(id)) throw new Error("Recovery execution already attempted; reconcile before retry.");
      if (await authorize({ action: "execute", actorId, key: decision.key, id }) !== true) {
        throw new Error("Recovery execution access denied.");
      }
      const report = await inspector.inspect(decision.key);
      if (report.status !== "possible-interrupted-anchor-update" ||
          report.safeToWrite !== false || report.trustedHead !== decision.trustedHead ||
          report.checkpointHead !== decision.checkpointHead) {
        throw new Error("Recovery checkpoint state changed.");
      }
      if (await verifyCommitProof({
        key: decision.key, trustedHead: decision.trustedHead,
        checkpointHead: decision.checkpointHead, proof
      }) !== true) {
        throw new Error("Recovery execution proof rejected.");
      }
      const timestamp = clock();
      if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
        throw new TypeError("Invalid recovery execution timestamp.");
      }
      // At most one CAS attempt per request in this runtime. Other processes
      // must coordinate using the atomic anchor CAS and a durable journal.
      attempted.add(id);
      const advanced = await anchor.compareAndSwap(
        decision.key, decision.trustedHead, decision.checkpointHead
      );
      if (advanced !== true) {
        // Record the failed attempt; never silently retry the same decision.
        await journal.append({ requestId: id, actorId, action: "failed", timestamp });
        throw new Error("Recovery anchor CAS conflict.");
      }
      try {
        const evidence = await journal.append({
          requestId: id, actorId, action: "executed", timestamp
        });
        return freeze({
          status: "executed", id, key: decision.key,
          headHash: decision.checkpointHead, evidence
        });
      } catch {
        const error = new Error(
          "Recovery anchor advanced but journal append failed; manual reconciliation required."
        );
        error.code = "RECOVERY_PARTIAL_COMMIT";
        throw error;
      }
    });
  }
  return freeze({ version: ANCHOR_RECOVERY_EXECUTOR_VERSION, execute });
}

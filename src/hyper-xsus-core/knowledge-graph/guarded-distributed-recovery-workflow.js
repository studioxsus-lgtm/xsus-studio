/**
 * Hyper XSUS Core — Guarded Distributed Recovery Workflow v1.0.0
 * Production-oriented composition gate: no execute unless a trusted journal
 * head is obtained independently and the journal/state/anchor agree.
 * The inner workflow must use an atomic fenced anchor implementation.
 * The trusted-head provider MUST NOT simply return journal.inspect().headHash.
 */
export const GUARDED_DISTRIBUTED_RECOVERY_VERSION = "1.0.0";
export function createGuardedDistributedRecoveryWorkflow({
  workflow, guard, trustedJournalHead
} = {}) {
  if (!workflow || typeof workflow.execute !== "function" ||
      typeof workflow.inspect !== "function" ||
      !guard || typeof guard.inspect !== "function" ||
      typeof trustedJournalHead !== "function") {
    throw new TypeError("Guarded recovery requires workflow, guard and trusted journal head provider.");
  }
  async function execute({ id, actorId, proof } = {}) {
    const record = await workflow.inspect({ id, actorId });
    const expectedJournalHead = await trustedJournalHead(record.key);
    const result = await guard.inspect({
      id, key: record.key, expectedJournalHead
    });
    if (result?.safeToExecute !== true || result.status !== "verified" ||
        result.id !== id || result.key !== record.key ||
        result.journalHead !== expectedJournalHead) {
      const error = new Error("Recovery journal consistency gate denied execution.");
      error.code = "RECOVERY_INTEGRITY_GATE_DENIED";
      throw error;
    }
    // The inner workflow independently rechecks authorization, proof, state,
    // lease and atomic anchor CAS. A concurrent journal mutation after this
    // read is prevented only by durable state reservation / anchor fencing.
    return workflow.execute({ id, actorId, proof });
  }
  return Object.freeze({
    version: GUARDED_DISTRIBUTED_RECOVERY_VERSION,
    execute
  });
}

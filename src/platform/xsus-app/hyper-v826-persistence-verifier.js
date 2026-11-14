/**
 * Hyper v8.2.6 — persistence/restart verification contract.
 * Read-only; a caller must provide independently collected observations.
 * No database or Render actions are performed by this module.
 */
export const HYPER_PERSISTENCE_VERIFIER_VERSION = "8.2.6";

export function verifyHyperPersistenceEvidence(evidence = {}) {
  const blockers = [];
  const audit = evidence.audit;
  const checkpoint = evidence.checkpoint;
  const before = evidence.beforeRestart;
  const after = evidence.afterRestart;

  if (audit?.verified !== true) blockers.push("AUDIT_STORE_NOT_VERIFIED");
  if (checkpoint?.verified !== true) blockers.push("CHECKPOINT_STORE_NOT_VERIFIED");
  if (audit?.projectId && checkpoint?.projectId &&
      audit.projectId === checkpoint.projectId)
    blockers.push("STORES_NOT_ISOLATED");

  // Require observations from an external live check, not caller-provided booleans alone.
  if (!before || !after ||
      typeof before.recordId !== "string" || !before.recordId ||
      typeof after.recordId !== "string" || !after.recordId ||
      typeof before.digest !== "string" || !before.digest ||
      typeof after.digest !== "string" || !after.digest)
    blockers.push("RESTART_OBSERVATIONS_MISSING");
  else {
    if (before.recordId !== after.recordId) blockers.push("RECORD_ID_MISMATCH");
    if (before.digest !== after.digest) blockers.push("RECORD_DIGEST_MISMATCH");
  }
  if (evidence.renderRestartConfirmed !== true)
    blockers.push("RENDER_RESTART_NOT_CONFIRMED");

  const unique = Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
    version: HYPER_PERSISTENCE_VERIFIER_VERSION,
    verified: unique.length === 0,
    blockers: unique,
    // An evaluation result is not itself proof that a real restart happened.
    source: "caller-supplied-evidence"
  });
}

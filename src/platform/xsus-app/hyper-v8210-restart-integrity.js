/**
 * Hyper v8.2.10 — independent restart evidence integrity.
 * Pure validator: no network, no restart, no database writes.
 * Evidence must be collected and authenticated by an independent operator.
 */
export const HYPER_RESTART_INTEGRITY_VERSION = "8.2.10";
const SHA256 = /^[a-f0-9]{64}$/i;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;

function instant(value) {
  if (typeof value !== "string" || !TIME.test(value)) return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19)
    ? time : NaN;
}
export function inspectHyperRestartIntegrity({ before, restart, after } = {}) {
  const blockers = [];
  const observations = [before, after];
  if (observations.some(x => !x || !ID.test(x.recordId || "") ||
      !SHA256.test(x.digest || "") || !ID.test(x.deploymentId || "") ||
      !ID.test(x.observationId || "") || !Number.isFinite(instant(x.observedAt))))
    blockers.push("INVALID_OBSERVATIONS");

  if (!restart || restart.verified !== true ||
      !ID.test(restart.previousDeploymentId || "") ||
      !ID.test(restart.currentDeploymentId || "") ||
      !ID.test(restart.eventId || "") ||
      !Number.isFinite(instant(restart.completedAt)))
    blockers.push("RESTART_ATTESTATION_MISSING");

  if (blockers.length === 0) {
    if (before.recordId !== after.recordId) blockers.push("RECORD_ID_MISMATCH");
    if (before.digest.toLowerCase() !== after.digest.toLowerCase())
      blockers.push("RECORD_DIGEST_MISMATCH");
    if (before.observationId === after.observationId)
      blockers.push("OBSERVATION_REUSED");
    if (restart.previousDeploymentId === restart.currentDeploymentId)
      blockers.push("DEPLOYMENT_UNCHANGED");
    if (before.deploymentId !== restart.previousDeploymentId ||
        after.deploymentId !== restart.currentDeploymentId)
      blockers.push("DEPLOYMENT_EVIDENCE_MISMATCH");
    if (!(instant(before.observedAt) < instant(restart.completedAt) &&
          instant(restart.completedAt) < instant(after.observedAt)))
      blockers.push("RESTART_CHRONOLOGY_INVALID");
  }
  const unique = Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
    version: HYPER_RESTART_INTEGRITY_VERSION,
    verified: unique.length === 0,
    blockers: unique,
    source: "unattested-input-validation"
  });
}

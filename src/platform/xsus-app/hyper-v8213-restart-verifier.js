/**
 * Hyper v8.2.13 — restart proof policy.
 * Render deploy history is NOT a restart attestation.
 * A separate, independently authenticated runtime lifecycle source is required.
 * This module is a pure policy gate, not a live provider.
 */
export const HYPER_RESTART_VERIFIER_VERSION = "8.2.13";

export function verifyHyperRuntimeRestart({ deploymentEvent, runtimeEvidence } = {}) {
  const blockers = [];
  if (!deploymentEvent || deploymentEvent.provider !== "render" ||
      deploymentEvent.eventKind !== "deployment-transition" ||
      deploymentEvent.authenticated !== true) {
    blockers.push("DEPLOYMENT_HISTORY_UNVERIFIED");
  }
  // Do not promote even authenticated deployment history into restart proof.
  if (!runtimeEvidence || runtimeEvidence.source !== "trusted-runtime-lifecycle" ||
      runtimeEvidence.authenticated !== true ||
      runtimeEvidence.beforeProcessId === runtimeEvidence.afterProcessId ||
      typeof runtimeEvidence.beforeProcessId !== "string" ||
      typeof runtimeEvidence.afterProcessId !== "string" ||
      !runtimeEvidence.beforeProcessId || !runtimeEvidence.afterProcessId) {
    blockers.push("INDEPENDENT_RUNTIME_RESTART_PROOF_MISSING");
  }
  // Runtime evidence is not yet wired to a real, independently authenticated
  // provider. Keep production eligibility blocked regardless of fixture input.
  blockers.push("RUNTIME_PROVIDER_NOT_IMPLEMENTED");
  return Object.freeze({
    version: HYPER_RESTART_VERIFIER_VERSION,
    verified: false,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    source: "fail-closed-restart-policy"
  });
}

/**
 * XSUS Hyper v8.2.3 — fail-closed activation gate.
 * Pure configuration decision: no network, filesystem or database access.
 * Never include secrets in the returned report.
 */
import { inspectHyperV819Preflight } from "../../hyper-xsus-core/knowledge-reasoning/hyper-production-preflight-v819.js";

export const HYPER_V81_ACTIVATION_GATE_VERSION = "8.2.3";

export function inspectHyperV81ActivationGate(env = {}) {
  const preflight = inspectHyperV819Preflight(env);
  const blockers = [...preflight.blockers];

  // Configuration readiness is necessary but not sufficient for production.
  // Evidence must be supplied by an independently verified deployment process.
  const evidence = {
    sqlVerified: false,
    adapterIntegrationVerified: false,
    liveStorageVerified: false,
    restartPersistenceVerified: false
  };

  if (!evidence.sqlVerified) blockers.push("SQL_NOT_VERIFIED");
  if (!evidence.adapterIntegrationVerified) blockers.push("ADAPTER_INTEGRATION_NOT_VERIFIED");
  if (!evidence.liveStorageVerified) blockers.push("LIVE_STORAGE_NOT_VERIFIED");
  if (!evidence.restartPersistenceVerified) blockers.push("RESTART_PERSISTENCE_NOT_VERIFIED");

  return Object.freeze({
    version: HYPER_V81_ACTIVATION_GATE_VERSION,
    configurationReady: preflight.configurationReady,
    activationAllowed: false,
    evidence: Object.freeze(evidence),
    blockers: Object.freeze([...new Set(blockers)].sort())
  });
}

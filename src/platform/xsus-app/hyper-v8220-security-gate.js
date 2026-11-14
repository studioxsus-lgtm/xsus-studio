/**
 * Hyper v8.2.20 — conservative persistence security assessment.
 * Pure, caller-supplied catalog findings are not authenticated evidence.
 * No activation authority is granted by this module.
 */
export const HYPER_PERSISTENCE_SECURITY_GATE_VERSION = "8.2.20";

export function assessHyperPersistenceSecurity(report = {}) {
  const blockers = [];
  if (report.tableExists !== true) blockers.push("RUNTIME_TABLE_MISSING");
  if (report.rlsEnabled !== true) blockers.push("RLS_NOT_ENABLED");
  if (report.forceRls !== true) blockers.push("FORCE_RLS_NOT_ENABLED");
  for (const role of ["anon", "authenticated"]) {
    const access = report.roles?.[role];
    if (!access || ["select", "insert", "update", "delete"].some(k => access[k] !== false))
      blockers.push("CLIENT_ROLE_PRIVILEGES_NOT_DENIED");
  }
  if (report.appendOnlyEnforced !== true)
    blockers.push("APPEND_ONLY_NOT_VERIFIED");
  if (report.immutableEvidenceVerified !== true)
    blockers.push("EVIDENCE_IMMUTABILITY_NOT_VERIFIED");
  if (report.serverRoleReviewed !== true)
    blockers.push("SERVER_ROLE_NOT_REVIEWED");
  // Even a complete caller-supplied report is not authenticated.
  blockers.push("LIVE_SECURITY_ATTESTATION_MISSING");
  return Object.freeze({
    version: HYPER_PERSISTENCE_SECURITY_GATE_VERSION,
    verified: false,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    source: "unattested-security-report"
  });
}

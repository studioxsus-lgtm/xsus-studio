/**
 * Hyper v8.2.28 — fail-closed atomic bundle security review.
 * This consumes untrusted audit findings, not authenticated DB attestations.
 */
export const HYPER_ATOMIC_SECURITY_VERSION = "8.2.28";
const blocked = Object.freeze(["select", "insert", "update", "delete", "truncate"]);
export function assessHyperAtomicSecurity(report = {}) {
  const blockers = [];
  if (report.tableExists !== true) blockers.push("BUNDLE_TABLE_MISSING");
  if (report.rlsEnabled !== true) blockers.push("BUNDLE_RLS_MISSING");
  if (report.forceRls !== true) blockers.push("BUNDLE_FORCE_RLS_MISSING");
  for (const role of ["anon", "authenticated"]) {
    if (blocked.some(p => report.roles?.[role]?.[p] !== false))
      blockers.push("CLIENT_PRIVILEGES_NOT_DENIED");
  }
  for (const trigger of ["updateDelete", "truncate"]) {
    if (report.triggers?.[trigger] !== true)
      blockers.push("APPEND_ONLY_TRIGGER_NOT_VERIFIED");
  }
  if (report.serverRoleReviewed !== true) blockers.push("SERVER_ROLE_NOT_REVIEWED");
  if (report.keyCustodyReviewed !== true) blockers.push("HMAC_KEY_CUSTODY_NOT_REVIEWED");
  blockers.push("AUTHENTICATED_LIVE_ATTESTATION_MISSING");
  return Object.freeze({
    version: HYPER_ATOMIC_SECURITY_VERSION, verified: false,
    productionEligible: false, source: "unattested-audit-findings",
    blockers: Object.freeze([...new Set(blockers)].sort())
  });
}

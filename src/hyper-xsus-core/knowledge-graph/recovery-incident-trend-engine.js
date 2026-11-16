/**
 * Hyper XSUS Core — Recovery Incident Trend Engine v1.0.0
 * Compares two validated, read-only incident triage results.
 * A trend is only meaningful for the same logical audit scope.
 * No recovery actions, persistence, or identity authorization.
 */
export const RECOVERY_INCIDENT_TREND_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LEVEL = Object.freeze({ none: 0, medium: 1, high: 2, critical: 3 });
const ACTIONS = new Set(["quarantine-and-investigate", "investigate-evidence", "manual-reconciliation-review"]);
function fail() { throw new TypeError("Invalid recovery incident trend input."); }
function validate(triage, maxIncidents) {
  if (!triage || triage.readOnly !== true || triage.automaticRecoveryAllowed !== false ||
      !Number.isSafeInteger(triage.revision) || triage.revision < 0 ||
      !Number.isSafeInteger(triage.total) || triage.total < 0 ||
      !Number.isSafeInteger(triage.incidentCount) || triage.incidentCount < 0 ||
      triage.incidentCount > maxIncidents || !Array.isArray(triage.incidents) ||
      triage.incidents.length !== triage.incidentCount ||
      !triage.summary || typeof triage.summary !== "object" ||
      Array.isArray(triage.summary) || !Object.hasOwn(LEVEL, triage.highestPriority)) fail();
  const counts = { critical: 0, high: 0, medium: 0 };
  const byId = new Map();
  let lastSeverity = Infinity;
  for (const item of triage.incidents) {
    if (!item || typeof item.id !== "string" || !ID.test(item.id) ||
        !Object.hasOwn(LEVEL, item.priority) || item.priority === "none" ||
        item.automaticRecoveryAllowed !== false ||
        !ACTIONS.has(item.action) || byId.has(item.id) ||
        LEVEL[item.priority] > lastSeverity) fail();
    lastSeverity = LEVEL[item.priority];
    counts[item.priority]++;
    byId.set(item.id, item);
  }
  if (Object.keys(triage.summary).length !== 3 ||
      Object.keys(counts).some(key => triage.summary[key] !== counts[key]) ||
      triage.highestPriority !== (triage.incidents[0]?.priority ?? "none") ||
      triage.total < triage.incidentCount) fail();
  return byId;
}
export function createRecoveryIncidentTrendEngine({ maxIncidents = 10000 } = {}) {
  if (!Number.isSafeInteger(maxIncidents) || maxIncidents < 1 || maxIncidents > 10000) {
    throw new TypeError("Invalid recovery incident trend configuration.");
  }
  function compare({ previous, current, scope } = {}) {
    if (typeof scope !== "string" || !ID.test(scope)) fail();
    const old = validate(previous, maxIncidents);
    const now = validate(current, maxIncidents);
    if (current.revision <= previous.revision) {
      throw new Error("Recovery incident trend requires increasing revisions.");
    }
    const added = [], resolved = [], escalated = [], deescalated = [], unchanged = [];
    for (const [id, item] of now) {
      const prior = old.get(id);
      if (!prior) added.push(id);
      else if (LEVEL[item.priority] > LEVEL[prior.priority]) escalated.push(id);
      else if (LEVEL[item.priority] < LEVEL[prior.priority]) deescalated.push(id);
      else unchanged.push(id);
    }
    for (const id of old.keys()) if (!now.has(id)) resolved.push(id);
    const sorted = arr => Object.freeze(arr.sort());
    return Object.freeze({
      version: RECOVERY_INCIDENT_TREND_VERSION, scope,
      previousRevision: previous.revision, currentRevision: current.revision,
      added: sorted(added), resolved: sorted(resolved),
      escalated: sorted(escalated), deescalated: sorted(deescalated),
      unchanged: sorted(unchanged),
      requiresManualReview: added.length > 0 || escalated.length > 0,
      readOnly: true, automaticRecoveryAllowed: false
    });
  }
  return Object.freeze({ version: RECOVERY_INCIDENT_TREND_VERSION, compare });
}

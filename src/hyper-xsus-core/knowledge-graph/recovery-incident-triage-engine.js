/**
 * Hyper XSUS Core — Recovery Incident Triage v1.0.0
 * Deterministic, read-only classification of validated audit reports.
 * No identity inference, automatic retries, anchor mutations, or remediation.
 */
export const RECOVERY_INCIDENT_TRIAGE_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ASSESSMENTS = new Set(["consistent", "reconcile", "inconsistent", "unavailable", "invalid", "missing"]);
const STATUSES = new Set(["pending", "approved", "executing", "executed", "failed", "revoked"]);
const PRIORITY = Object.freeze({
  inconsistent: "critical", invalid: "critical",
  unavailable: "high", missing: "high", reconcile: "medium",
  consistent: "none"
});
const SEVERITY = Object.freeze({ critical: 4, high: 3, medium: 2, none: 0 });
function invalid() { throw new TypeError("Invalid recovery incident triage report."); }
export function createRecoveryIncidentTriageEngine({ maxRecords = 10000 } = {}) {
  if (!Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > 10000) {
    throw new TypeError("Invalid recovery incident triage configuration.");
  }
  function assess(report) {
    if (!report || report.readOnly !== true || report.automaticRecovery !== false ||
        !Number.isSafeInteger(report.revision) || report.revision < 0 ||
        !Number.isSafeInteger(report.total) || report.total < 0 ||
        report.total > maxRecords || !Array.isArray(report.records) ||
        report.records.length !== report.total || !report.counts ||
        typeof report.counts !== "object" || Array.isArray(report.counts)) invalid();
    const counts = Object.create(null);
    const incidents = [];
    let previousId = null;
    for (const record of report.records) {
      if (!record || typeof record.id !== "string" || !ID.test(record.id) ||
          (previousId !== null && record.id <= previousId) ||
          !ASSESSMENTS.has(record.assessment) ||
          !STATUSES.has(record.persistedStatus) ||
          record.safeToRetry !== false) invalid();
      previousId = record.id;
      counts[record.assessment] = (counts[record.assessment] ?? 0) + 1;
      const priority = PRIORITY[record.assessment];
      if (priority !== "none") incidents.push(Object.freeze({
        id: record.id, assessment: record.assessment, priority,
        action: priority === "critical" ? "quarantine-and-investigate" :
          priority === "high" ? "investigate-evidence" : "manual-reconciliation-review",
        automaticRecoveryAllowed: false
      }));
    }
    const keys = Object.keys(report.counts);
    if (keys.length !== Object.keys(counts).length ||
        keys.some(key => !ASSESSMENTS.has(key) ||
          !Number.isSafeInteger(report.counts[key]) ||
          report.counts[key] !== counts[key])) invalid();
    incidents.sort((a, b) => SEVERITY[b.priority] - SEVERITY[a.priority] ||
      a.id.localeCompare(b.id, "en"));
    const summary = { critical: 0, high: 0, medium: 0 };
    for (const incident of incidents) summary[incident.priority]++;
    return Object.freeze({
      version: RECOVERY_INCIDENT_TRIAGE_VERSION, revision: report.revision,
      total: report.total, incidentCount: incidents.length,
      highestPriority: incidents[0]?.priority ?? "none",
      summary: Object.freeze(summary), incidents: Object.freeze(incidents),
      readOnly: true, automaticRecoveryAllowed: false
    });
  }
  return Object.freeze({ version: RECOVERY_INCIDENT_TRIAGE_VERSION, assess });
}

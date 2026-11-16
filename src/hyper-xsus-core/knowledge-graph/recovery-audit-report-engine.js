/**
 * Hyper XSUS Core — Recovery Audit Report Engine v1.0.0
 * Generates a bounded, read-only report from an authorized snapshot session.
 * No automatic recovery, anchor writes, journal changes, or retries.
 * A failed/changed page invalidates the entire report (fail closed).
 */
export const RECOVERY_AUDIT_REPORT_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ASSESSMENTS = new Set(["consistent", "reconcile", "inconsistent", "unavailable", "invalid", "missing"]);
const freeze = Object.freeze;
export function createRecoveryAuditReportEngine({
  sessionFactory, authorize, clock = () => Date.now(), maxRecords = 1000,
  pageSize = 100
} = {}) {
  if (typeof sessionFactory !== "function" || typeof authorize !== "function" ||
      typeof clock !== "function" || !Number.isSafeInteger(maxRecords) ||
      maxRecords < 1 || maxRecords > 10000 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > maxRecords) {
    throw new TypeError("Invalid recovery audit report configuration.");
  }
  async function generate({ actorId } = {}) {
    if (typeof actorId !== "string" || !ID.test(actorId)) {
      throw new TypeError("Invalid recovery audit report actor.");
    }
    if (await authorize({ action: "audit-report", actorId }) !== true) {
      throw new Error("Recovery audit report access denied.");
    }
    // A fresh session per report prevents overlapping reports from replacing
    // one another's baselines and leaking records across callers.
    const session = sessionFactory();
    if (!session || typeof session.begin !== "function" || typeof session.page !== "function") {
      throw new TypeError("Recovery audit report requires a fresh snapshot session.");
    }
    const start = await session.begin({ actorId });
    if (!Number.isSafeInteger(start?.total) || start.total < 0 ||
        start.total > maxRecords || !Number.isSafeInteger(start.revision)) {
      throw new Error("Invalid recovery audit report baseline.");
    }
    const counts = Object.create(null);
    const records = [];
    const seenIds = new Set();
    let previousId = null;
    let offset = 0;
    while (offset < start.total) {
      const limit = Math.min(pageSize, start.total - offset);
      const page = await session.page({ actorId, offset, limit });
      if (!page || page.revision !== start.revision ||
          page.total !== start.total || !Array.isArray(page.records) ||
          page.records.length !== limit ||
          page.nextOffset !== (offset + limit < start.total ? offset + limit : null)) {
        throw new Error("Recovery audit report page consistency failure.");
      }
      for (const record of page.records) {
        if (!record || !ASSESSMENTS.has(record.assessment) ||
            typeof record.id !== "string" || !ID.test(record.id) ||
            seenIds.has(record.id)) {
          throw new Error("Recovery audit report contains invalid or repeated records.");
        }
        if (previousId !== null && record.id <= previousId) {
          throw new Error("Recovery audit report page order consistency failure.");
        }
        seenIds.add(record.id);
        previousId = record.id;
        counts[record.assessment] = (counts[record.assessment] ?? 0) + 1;
        records.push(freeze({
          id: record.id,
          assessment: record.assessment,
          persistedStatus: record.persistedStatus,
          safeToRetry: false
        }));
      }
      offset += limit;
    }
    // An empty session still needs a final read to detect drift since begin.
    if (start.total === 0) {
      const page = await session.page({ actorId, offset: 0, limit: 1 });
      if (!page || page.revision !== start.revision ||
          page.total !== 0 || !Array.isArray(page.records) ||
          page.records.length !== 0 || page.nextOffset !== null) {
        throw new Error("Recovery audit report empty-session consistency failure.");
      }
    }
    const timestamp = clock();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("Invalid recovery audit report timestamp.");
    }
    return freeze({
      version: RECOVERY_AUDIT_REPORT_VERSION, revision: start.revision,
      timestamp, total: start.total, counts: freeze({ ...counts }),
      records: freeze(records), readOnly: true, automaticRecovery: false
    });
  }
  return freeze({ version: RECOVERY_AUDIT_REPORT_VERSION, generate });
}

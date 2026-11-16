/**
 * Hyper XSUS Core — Recovery Reconciliation Engine v1.0.0
 * Read-only, fail-closed classification of interrupted distributed recovery.
 * No automatic anchor rewrites, journal edits or state transitions.
 * The trusted journal head must come from an independent durable authority.
 */
export const RECOVERY_RECONCILIATION_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const terminal = new Set(["executed", "failed", "revoked"]);
const result = (id, status, reason, evidence = {}) =>
  Object.freeze({ id, status, reason, safeToRetry: false, ...evidence });
export function createRecoveryReconciliationEngine({
  state, journal, anchor, trustedJournalHead
} = {}) {
  if (!state || typeof state.get !== "function" ||
      !journal || typeof journal.inspect !== "function" ||
      !anchor || typeof anchor.inspect !== "function" ||
      typeof trustedJournalHead !== "function") {
    throw new TypeError("Recovery reconciliation requires state, journal, anchor and trusted head provider.");
  }
  async function inspect({ id } = {}) {
    if (typeof id !== "string" || !ID.test(id)) throw new TypeError("Invalid recovery reconciliation ID.");
    let record;
    try { record = await state.get(id); }
    catch { return result(id, "unavailable", "state-unavailable"); }
    if (!record) return result(id, "missing", "request-not-found");
    if (!ID.test(record.key) || !HASH.test(record.trustedHead) ||
        !HASH.test(record.checkpointHead) || record.trustedHead === record.checkpointHead) {
      return result(id, "invalid", "request-invalid");
    }
    let history, current;
    try {
      const head = await trustedJournalHead(record.key);
      if (typeof head !== "string" || !HASH.test(head)) throw new Error("invalid trusted head");
      [history, current] = await Promise.all([
        journal.inspect({ expectedHeadHash: head }), anchor.inspect(record.key)
      ]);
      if (history.headHash !== head || !Array.isArray(history.records) ||
          !current || !HASH.test(current.headHash)) throw new Error("invalid evidence");
    } catch {
      return result(id, "unavailable", "integrity-evidence-unavailable");
    }
    const events = history.records.filter(x => x.requestId === id).map(x => x.action);
    const count = action => events.filter(x => x === action).length;
    if (count("proposed") !== 1 || events[0] !== "proposed" ||
        count("approved") > 1 || count("executed") > 1 ||
        count("failed") > 1 || count("revoked") > 1 ||
        events.some(x => !["proposed", "approved", "executed", "failed", "revoked"].includes(x))) {
      return result(id, "inconsistent", "journal-event-sequence-invalid");
    }
    const approved = count("approved") === 1 && events[1] === "approved";
    const executed = count("executed") === 1 && events[2] === "executed";
    const anchorAdvanced = current.headHash === record.checkpointHead;
    const anchorOriginal = current.headHash === record.trustedHead;
    if (!anchorAdvanced && !anchorOriginal) {
      return result(id, "inconsistent", "anchor-head-unrecognized");
    }
    if (record.status === "executed" && approved && executed && anchorAdvanced) {
      return result(id, "consistent", "completed");
    }
    if (record.status === "executing") {
      if (!approved) return result(id, "inconsistent", "execution-without-approval");
      if (anchorAdvanced && executed) return result(id, "reconcile", "state-finalization-pending");
      if (anchorAdvanced) return result(id, "reconcile", "journal-and-state-finalization-pending");
      if (anchorOriginal && !executed) return result(id, "reconcile", "execution-outcome-unconfirmed");
    }
    if (terminal.has(record.status) || executed || anchorAdvanced) {
      return result(id, "inconsistent", "terminal-state-evidence-mismatch");
    }
    if (record.status === "approved" && approved && anchorOriginal && events.length === 2) {
      return result(id, "consistent", "approved-awaiting-execution");
    }
    if (record.status === "pending" && events.length === 1 && anchorOriginal) {
      return result(id, "consistent", "pending-approval");
    }
    return result(id, "inconsistent", "state-journal-mismatch");
  }
  return Object.freeze({ version: RECOVERY_RECONCILIATION_VERSION, inspect });
}

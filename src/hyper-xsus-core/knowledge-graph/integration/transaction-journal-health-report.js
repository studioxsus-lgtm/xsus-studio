/**
 * Hyper XSUS Core — advisory health reporting v4.2.0.
 * No writes, lock acquisition, recovery, or automatic cleanup.
 * A health report is a point-in-time observation, not a transactionally consistent snapshot.
 */
import { diagnoseTransactionJournal } from "./transaction-journal-diagnostics.js";

export const TRANSACTION_JOURNAL_HEALTH_REPORT_VERSION = "4.2.0";

export async function createTransactionJournalHealthReport(filePath, options = {}) {
  const diagnostic = await diagnoseTransactionJournal(filePath, options);
  const warnings = [];
  if (diagnostic.status === "missing") warnings.push("JOURNAL_MISSING");
  if (diagnostic.status === "invalid") warnings.push("JOURNAL_INVALID");
  if (diagnostic.lockPresent) warnings.push("LOCK_PRESENT_UNVERIFIED");
  if (diagnostic.temporaryFileCount > 0) warnings.push("TEMPORARY_FILES_PRESENT");
  if ((diagnostic.counts?.running ?? 0) > 0) warnings.push("RUNNING_TRANSACTIONS_PRESENT");
  if ((diagnostic.counts?.failed ?? 0) > 0) warnings.push("FAILED_TRANSACTIONS_PRESENT");
  if ((diagnostic.counts?.interrupted ?? 0) > 0) warnings.push("INTERRUPTED_TRANSACTIONS_PRESENT");

  const level = diagnostic.status === "invalid" ? "critical"
    : diagnostic.status === "missing" ? "unknown"
    : warnings.length ? "attention" : "healthy";
  return Object.freeze({
    reportVersion: TRANSACTION_JOURNAL_HEALTH_REPORT_VERSION,
    level,
    journalStatus: diagnostic.status,
    revision: diagnostic.revision,
    transactionCount: diagnostic.entries,
    transactionCounts: diagnostic.counts,
    lockPresent: diagnostic.lockPresent,
    temporaryFileCount: diagnostic.temporaryFileCount,
    errorCode: diagnostic.errorCode,
    warnings: Object.freeze(warnings),
    readOnly: true,
    cleanupPerformed: false,
    advisory: true,
  });
}

/**
 * Hyper XSUS Core — Safe Lock Recovery v1.0.0 (assessment gate).
 * Fail-closed, read-only decision support. No lock removal or automatic stealing.
 */
import { inspectExclusiveFileLock } from "./exclusive-file-lock.diagnostics.js";

export const LOCK_RECOVERY_DECISIONS = Object.freeze({
  AVAILABLE: "available",
  BLOCKED_ACTIVE: "blocked-active",
  MANUAL_REVIEW: "manual-review",
  BLOCKED_UNKNOWN: "blocked-unknown",
});

/**
 * A missing PID is not sufficient proof of ownership or exclusive access:
 * PID reuse, containers, remote filesystems and inspection races remain.
 */
export async function assessExclusiveLockRecovery(filePath) {
  const inspection = await inspectExclusiveFileLock(filePath);
  let decision;
  let reason;
  switch (inspection.status) {
    case "absent":
      decision = LOCK_RECOVERY_DECISIONS.AVAILABLE;
      reason = "No lock exists; normal journal access may be attempted.";
      break;
    case "process-present":
      decision = LOCK_RECOVERY_DECISIONS.BLOCKED_ACTIVE;
      reason = "The recorded PID exists; never remove this lock automatically.";
      break;
    case "process-missing":
      decision = LOCK_RECOVERY_DECISIONS.MANUAL_REVIEW;
      reason = "PID missing is not proof of safe removal; verify host, owner and filesystem.";
      break;
    case "malformed":
      decision = LOCK_RECOVERY_DECISIONS.MANUAL_REVIEW;
      reason = "Ownership metadata is invalid; manual investigation required.";
      break;
    default:
      decision = LOCK_RECOVERY_DECISIONS.BLOCKED_UNKNOWN;
      reason = "Lock state cannot be verified; fail closed.";
  }
  return Object.freeze({
    ...inspection,
    decision,
    reason,
    automaticRemovalAllowed: false,
    requiresManualReview: decision === LOCK_RECOVERY_DECISIONS.MANUAL_REVIEW,
  });
}

# Hyper XSUS Core v5.5 — Recovery Decision Verification

The read-only verifier builds recommendations from a signed operational
report and immediately obtains a second authenticated operational report.
It rejects changes to archive/checkpoint count or tip, blockers, status,
or safeToResume with `XSUS_RECOVERY_DECISION_STALE`. Invalid snapshot
shapes fail with `XSUS_RECOVERY_DECISION_VERIFY_INVALID`.

API: `createRecoveryDecisionVerification({inspectOperationalReadiness}).assess()`
and `createIncidentRecoveryIntegration(...).verifyRecoveryDecisions()`.

Output includes `verified:true`, immutable recommendations and an
immutable snapshot reference. Recommendations are advisory and still
require human approval; verification does not authorize, execute,
promote, repair or delete anything.

Important: two consistent reads are not a durable lease or an atomic
multi-store transaction. State may change immediately after return.
Consumers must revalidate at the moment of any separately authorized
action; the existing promotion gate remains authoritative.

Eleven regression scenarios are included. Run `npm test` in GitHub
Actions. Only `feature/xsus-ai-core` was modified; `main` unchanged.

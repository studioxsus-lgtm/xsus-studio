# Hyper XSUS Core v5.3 — Recovery Incident Diagnostics

Introduces a deterministic, read-only classifier for operational
readiness reports. New API:

- `classifyRecoveryOperationalReport(report)`
- `createRecoveryDiagnostics({inspectOperationalReadiness}).assess()`
- `createIncidentRecoveryIntegration(...).inspectRecoveryDiagnostics()`

The diagnostic output is immutable and includes status,
safeToResume, severity, requiresManualReview and sorted incident
records containing code, category, severity and manual-review flag.

Categories: `integrity` (archive rollback or trusted-prefix fork),
`unanchored-evidence`, `writer-lock`, `incomplete-write`,
and `unclassified` for future blockers. Unknown blockers fail
closed; they are not treated as safe. Severity labels are advisory
and do not change the underlying promotion policy.

Eleven regression tests cover classifications, deduplication,
unknown codes, malformed input, immutability, real integration,
and error propagation.

This module performs no automatic repair, deletion, authorization,
or checkpoint promotion. Run `npm test` to verify. Development
branch `feature/xsus-ai-core`; `main` unchanged.

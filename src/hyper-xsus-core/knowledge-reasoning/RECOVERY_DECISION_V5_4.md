# Hyper XSUS Core v5.4 — Recovery Decision Intelligence

Adds advisory, read-only recovery recommendations based on v5.3 diagnostics.

Public APIs:
- `decideRecoveryActions(diagnostics)`
- `createRecoveryDecisionIntelligence({inspectRecoveryDiagnostics}).assess()`
- `createIncidentRecoveryIntegration(...).inspectRecoveryDecisions()`

The immutable result includes `version`, `status`, `safeToResume`,
`requiresManualReview`, and `recommendedActions`. Recommendations
carry `incidentCode`, `action`, `priority`, and
`requiresHumanApproval: true`.

Critical integrity incidents are listed first. Unknown blockers fail
closed and are escalated. The engine never executes a recommendation,
approves promotion, changes authorization policy, removes locks, repairs
storage, or advances a checkpoint. Decisions describe the authenticated
snapshot at assessment time; they are not a guarantee of future state.

Eleven regression tests cover safe state, all known diagnostic
categories, unknown blockers, priority ordering, malformed input,
immutability, error propagation and real read-only integration.

Run `npm test` in GitHub Actions. Work is limited to
`feature/xsus-ai-core`; `main` remains untouched.

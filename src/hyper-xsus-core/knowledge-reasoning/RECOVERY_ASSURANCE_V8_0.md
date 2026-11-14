# Hyper XSUS Core v8.0 — Recovery Assurance Milestone

## Scope and implementation

The v7.8–v8.0 completion package consolidates recovery security
verification into a new bounded, read-only multi-round assurance layer.

- `recovery-assurance-v80.js` exports
  `createRecoveryAssurance({inspectHealth,rounds=3})`.
- Valid rounds: integers from 2 to 8. Each round runs the existing
  v7.0 coordinated four-observation architecture assessment.
- Any blocked round permanently blocks the overall assessment.
- Authenticated audit and anchor marks must agree across all
  successful rounds. Cross-round changes fail closed.
- Results are frozen. Failed results expose null marks.
- Unexpected I/O failures propagate; known integrity failures are
  handled by the existing security verifiers.
- The incident recovery facade optionally exposes
  `assessTrustedRecoveryAssurance()` when a trusted anchor is configured.
  Existing facade methods and versions remain unchanged.

## Verification

The contract test suite contains 14 tests, covering round limits,
12/32 observations, cross-round drift, early/late blockers,
known/unexpected errors, and immutable results.

The signed integration suite contains 9 tests, covering signed audit
advancement, parallel assessments, pending/lock evidence, rollback,
and checkpoint tampering.

The existing v7.0–v7.7 test suites remain intact. Run `npm test`
on `feature/xsus-ai-core` and confirm all tests before marking
v8.0 verified. No claim of passing CI is made by publication alone.

## Security boundaries

Read-only assurance is NOT an atomic snapshot, distributed consensus,
external rollback authority, recovery lease, automatic repair, or
authorization to resume. An attacker controlling both local signing
keys and stores may defeat local integrity checks. The optional
reviewer authorization in the trusted anchor remains independent.

`main` and the public website are not changed.

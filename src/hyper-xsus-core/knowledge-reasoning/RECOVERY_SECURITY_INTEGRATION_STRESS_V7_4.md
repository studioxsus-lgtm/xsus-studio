# Hyper XSUS Core v7.4 — Recovery Security Integration & Stress Validation

This phase adds fourteen tests in
`tests/recovery-security-integration-stress-v74.test.js`.

Coverage:
- 40 authenticated sequential security assessments after five signed advances.
- 60 concurrent read-only assessments of a stable authenticated checkpoint.
- 20 append/anchor/verification cycles.
- State changes between independent verifier windows and within either window.
- 20 repeated inspections each preserving checkpoint pending evidence,
  checkpoint writer locks, and audit pending evidence.
- Authenticated audit rollback detection.
- Tampered checkpoint detection without modifying evidence during inspection.
- Known integrity failures fail closed; unexpected storage failures propagate.
- Immutable ready and blocked results.

Filesystem tests use isolated temporary directories with cleanup.
Stress tests have explicit 90-second Vitest timeouts.

No production API, signing key, or authorization logic is changed.
Security assessments remain advisory: they are not atomic recovery
leases, repair mechanisms, or permission to resume.

Run `npm test` on `feature/xsus-ai-core` and inspect CI results
before marking this phase verified. The `main` branch is untouched.

# Hyper XSUS Core v7.6 — Security Consistency & Recovery Assurance

Adds sixteen regression and stress tests in
`tests/recovery-security-consistency-assurance-v76.test.js`.

Coverage:
- 50 authenticated sequential assessments.
- 70 concurrent read-only authenticated assessments.
- 20 signed audit append, trusted anchor advance and verification cycles.
- Cross-window anchor changes and last-observation audit tip changes.
- Inconsistent audit/anchor counts, malformed hashes and contradictory
  readiness reports with blockers.
- 20 blocked assessments each preserving checkpoint pending evidence,
  checkpoint writer lock evidence and audit pending evidence.
- Signed audit rollback, checkpoint tampering, known integrity errors,
  unexpected I/O failures and immutable public reports.

Tests use isolated temporary filesystem fixtures and cleanup.
Stress tests have explicit 90-second Vitest timeouts.

No production APIs, signing keys, or authorization logic were changed.
The assessment remains read-only and advisory; it is not an atomic
recovery lease or automatic repair. Run `npm test` on
`feature/xsus-ai-core` before marking v7.6 verified.
The `main` branch remains untouched.

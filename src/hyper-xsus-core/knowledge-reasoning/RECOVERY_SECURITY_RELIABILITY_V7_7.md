# Hyper XSUS Core v7.7 — Recovery Security Reliability

Fifteen tests added in `tests/recovery-security-reliability-v77.test.js`.

Coverage:
- 80 sequential and 80 concurrent authenticated read-only checks.
- 25 signed audit append and trusted anchor advance cycles.
- State changes between verification windows and within each window.
- Earlier blockers cannot be cleared by a later clean observation.
- Known integrity errors on the final observation fail closed;
  unexpected I/O errors propagate.
- 25 blocked inspections each preserve checkpoint pending evidence,
  checkpoint writer locks and audit pending evidence.
- Signed audit rollback and checkpoint tampering detection.
- Immutable public reports and null trusted marks when blocked.

Isolated temporary directories are cleaned up after each filesystem
scenario. Stress tests use explicit 90-second Vitest timeouts.

This phase changes no production API or authorization policy.
Assessments remain advisory, not an atomic recovery lease or
permission to resume. Run `npm test` on `feature/xsus-ai-core`
before marking v7.7 verified. `main` remains untouched.

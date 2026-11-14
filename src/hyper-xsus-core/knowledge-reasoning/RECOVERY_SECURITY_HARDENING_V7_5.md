# Hyper XSUS Core v7.5 — Recovery Security Hardening

Fifteen regression tests were added in
`tests/recovery-security-hardening-v75.test.js`.

Coverage:
- 30 consecutive authenticated architecture assessments.
- 50 parallel read-only assessments.
- 15 signed audit append, trusted anchor advance and verification cycles.
- Checkpoint changes between verification windows and audit changes
  inside the security window.
- Malformed checkpoint marks and contradictory readiness/blocker reports.
- Repeated inspections preserving checkpoint pending evidence, writer
  locks and audit pending evidence.
- Signed audit rollback and checkpoint tampering detection.
- Known integrity failures fail closed, unexpected I/O failures propagate.
- Immutable safe and blocked result structures.

Filesystem fixtures use isolated temporary directories with cleanup;
long-running cases use explicit 90-second Vitest timeouts.

No production API, signing key, or recovery authorization flow was
changed. These assessments remain advisory and do not provide an
atomic recovery lease or automatic repair. Run `npm test` on
`feature/xsus-ai-core` before confirming v7.5. `main` is untouched.

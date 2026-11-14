# Hyper XSUS Core v7.3 — Advanced Recovery Security Verification

Adds twelve regression tests in
`tests/recovery-advanced-security-verification-v73.test.js`.

Coverage includes:
- Twenty stable signed-state assessments after authenticated audit advancement.
- Thirty concurrent read-only security assessments.
- Signed audit payload tampering and checkpoint tampering.
- Changes between operational and security inspection windows.
- Final-observation audit tip changes.
- Forged ready reports with blockers and invalid audit counts.
- Ten repeated inspections preserving audit pending evidence.
- Ten repeated inspections preserving checkpoint writer locks.
- Known integrity exceptions fail closed and unexpected storage failures propagate.

Filesystem fixtures use independent temporary directories and cleanup.
Long-running tests have explicit 90-second Vitest timeouts.

No production API, signing key, authorization flow or recovery policy is
changed. The coordinated check is advisory, not an atomic lease,
external rollback authority or automatic repair. Execute `npm test`
on `feature/xsus-ai-core` before confirming v7.3. `main` is untouched.

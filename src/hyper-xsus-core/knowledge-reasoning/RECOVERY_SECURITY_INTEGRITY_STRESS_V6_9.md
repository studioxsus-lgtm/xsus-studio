# Hyper XSUS Core v6.9 — Advanced Recovery Security & Integrity Stress Testing

Adds twelve tests in `tests/recovery-security-integrity-stress-v69.test.js`.

Scenarios include:
- 50 sequential signed-state security validations.
- 30 authenticated audit append / anchor advance / security validation cycles.
- 60 parallel read-only security validations.
- 20 consecutive checks detecting authenticated audit rollback.
- 20 checks preserving checkpoint pending evidence and 20 preserving writer locks.
- Rejection of forged ready reports, malformed marks, and changing anchor or audit.
- Immutable snapshot semantics when an inspector mutates previously returned reports.
- Fail-closed handling of known signed-state integrity errors.

Each filesystem test uses a separate temporary fixture and cleans it up.
Long-running stress cases have explicit 90-second Vitest timeouts.
The existing v6.8 production API and the recovery authorization boundary
are unchanged.

This does not provide an atomic lease, external monotonic trust authority,
or automatic repair. Run `npm test` on `feature/xsus-ai-core`
and confirm the result before marking v6.9 verified. `main` is untouched.

# Hyper XSUS Core v6.5 — Recovery Security & Operational Verification

This phase adds a read-only two-pass operational verification layer:
`createRecoveryOperationalVerification({inspectHealth}).assess()`.
The optional incident recovery integration exposes
`verifyTrustedAuditRecoveryOperation()` when a trusted audit anchor is configured.

The verifier reads trusted anchor health twice and requires:
- both observations to report ready, with no blockers;
- valid anchor/audit marks, with audit count not behind anchor;
- identical anchor and audit count/tip in both observations.

A changed state, malformed report, or known XSUS integrity error
blocks readiness. Unexpected infrastructure failures propagate to the caller.
Reports are immutable, contain sorted blockers and stable state summaries,
and never write, repair, authorize or promote anything.

Twelve tests cover healthy initial and advanced states, changed anchor
or audit, checkpoint pending/lock residue, audit pending residue,
malformed observations, lagging audit, known security errors,
unexpected I/O errors and input validation.

**Security boundary:** two reads are not an atomic snapshot, a
transaction, a monotonic external authority, or permission to resume.
A change that occurs after the second read is not prevented.
Operational authorization must remain separate.

Run `npm test` on `feature/xsus-ai-core` before declaring v6.5
verified. The `main` branch is not modified.

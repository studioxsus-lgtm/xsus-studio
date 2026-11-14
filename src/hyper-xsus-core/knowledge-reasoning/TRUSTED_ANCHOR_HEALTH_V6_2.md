# Hyper XSUS Core v6.2 — Trusted Anchor Integrity & Recovery Hardening

Adds `createTrustedAnchorHealth({directory,readAnchor,inspectAudit})`
as a read-only health assessor. The existing v6.0 trusted anchor
exposes `inspectHealth()`, and the optional incident recovery facade
exposes `inspectTrustedAuditAnchorHealth()`.

The assessor:
- checks checkpoint writer lock and pending write residue before and
  after reading;
- verifies the signed anchor through the existing checkpoint reader;
- checks the authenticated audit against the trusted anchor;
- reads the anchor again and detects changes during inspection;
- returns an immutable report with sorted blockers, audit/anchor
  summaries, `status`, and `safeToResume`.

Ten regression tests cover healthy initialization and advancement,
lock/pending residue, corrupted anchor, signed rollback, audit pending,
concurrent anchor change, missing anchor, and malformed audit reports.

The health report is advisory and **not** an atomic read lease,
automatic authorization, external trusted anchor, or repair mechanism.
The system remains fail-closed and requires manual review of residue.
No existing method is removed; v4.9 initialize idempotency remains
unchanged.

Run `npm test` on `feature/xsus-ai-core` before declaring v6.2 verified.
The `main` branch is unchanged.

# Hyper XSUS Core v2.0.0 — Trusted recovery coordinator

`createTrustedAuditRecovery({anchors,highWater})` is opt-in.
`anchors` must implement `list/verify/rotate` (the v1.9 rotating
anchor interface). `highWater` must implement `read()` and
`advance(expectedSequence,nextSequence)`, backed by a **separate,
durable, trusted and compare-and-swap protected** monotonic store.

- `inspect(snapshot)` fails closed if the newest anchor is below the
  externally committed high-water mark (deletion/rollback), above the
  mark (uncommitted checkpoint after crash), or fails signature/history
  verification.
- `advance(snapshot)` verifies the current checkpoint, creates a
  strictly newer signed anchor, and then advances the trusted mark.
- A crash between the two operations leaves an explicit PENDING state,
  not automatic recovery. An operator must reconcile it using a
  separately authenticated procedure.

## Security limits

This module supplies no real remote high-water backend and does not
certify external trust. The provider must guarantee durable atomic CAS
and reject backwards moves. Restrict concurrent coordinators and
journal writers; an external lock/fencing protocol is still required
for full cross-process correctness. Neither the audit journal nor the
anchor directory can serve as the independent high-water authority.

The coordinator does not automatically integrate into the v1.8
lifecycle adapter, repair partial checkpoint files, or provide a
production-ready crash recovery protocol. Existing APIs and the
persistent journal format remain unchanged.

Run the eight focused v2.0 tests and the full suite. Integration tests
against an actual independent high-water backend are still required.

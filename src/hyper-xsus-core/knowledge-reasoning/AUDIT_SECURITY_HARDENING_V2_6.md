# Hyper XSUS Core v2.6.0 — Signed-anchor security regression

Seven Vitest regression tests use actual HMAC-SHA256 anchor signing and
filesystem-backed v1.9 checkpoint rotation. Coverage includes:

1. Tampered checkpoint signature
2. Checkpoint signed with the wrong secret
3. Replay of a valid older checkpoint under a newer filename
4. Same-sequence signed history fork
5. Journal rollback below signed anchor
6. Deletion of newest checkpoint against an independent high-water mark
7. Reconciliation rejection before approval when a signed checkpoint is corrupted

These are focused negative tests, not a penetration test or a proof
of security against a privileged adversary. The trusted high-water
provider in tests is a fixture; no production-grade external backend
or distributed fencing service is implemented by this phase.

Run `npm test` on `feature/xsus-ai-core` and review CI results.
The existing persistent journal format and production APIs are unchanged.

# Hyper XSUS Core v2.8.0 — Audit recovery validation

Six filesystem-backed integration tests validate:
1. Ten independent coordinator reconstructions before and after an explicitly approved pending-anchor reconciliation.
2. Rejection of repeated reconciliation against the same committed checkpoint.
3. Fail-closed handling when trusted high-water exceeds the latest signed anchor.
4. Rejection of a truncated newest checkpoint before reviewer approval.
5. Detection of deletion of a previously committed checkpoint after reopening.
6. Two successive pending checkpoints each requiring distinct authorization.

The anchor store uses actual HMAC-signed files. The high-water/lease
provider is an in-memory test fixture, not a production distributed CAS
backend. Reconstructing objects is not a full operating-system restart,
and this phase does not prove multi-host consistency or crash durability.

Run `npm test` on `feature/xsus-ai-core` before marking v2.8 verified.
No changes to main or XSUS AI Core are required.

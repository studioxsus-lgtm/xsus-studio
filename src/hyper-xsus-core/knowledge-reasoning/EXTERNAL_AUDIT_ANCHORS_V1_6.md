# Hyper XSUS Core v1.6.0 — External audit anchors

`audit-anchor-verifier.js` exposes `createAuditAnchorVerifier({key,keyId})`
with `createAnchor(snapshot)` and `verifyAnchor(snapshot,anchor)`.

The anchor authenticates the audit sequence and SHA-256 chain tip with
HMAC-SHA256 using a separately managed secret (at least 32 bytes).
Store the signed anchor in a distinct, access-controlled trust domain.
A verifier should load a trusted external anchor and compare it against
the latest persisted audit snapshot. Do not store the only anchor beside
the mutable journal. Rotate keys deliberately and retain old verification
keys as required.

Verification rejects invalid signatures, rollbacks, observable forks,
and progress beyond the retained history where the anchor cannot be
verified. It does not silently accept unverifiable checkpoints.

**Security boundaries:** This is symmetric-key authentication, not
public-key signatures, an external timestamp authority, append-only
storage, or a managed anchor service. A stolen HMAC key can forge
checkpoints. The snapshot passed to this module must already be validated
by the persistent audit engine. No automatic persistence or runtime
integration has been implemented yet. Production readiness remains open.

Run `npm test` and inspect the nine focused v1.6.0 tests.

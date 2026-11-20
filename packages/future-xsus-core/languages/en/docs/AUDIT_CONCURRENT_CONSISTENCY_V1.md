# Audit Concurrent Consistency V1

A read-only, owner-scoped, two-pass consistency checker for the
review audit and SHA-256 receipt chain. It compares complete audit
and chain snapshots before and after an optional test-only callback,
checks event count, sequence/status alignment, chain hash links,
reason encoding, and optionally compares an expected trusted head.
Each snapshot has a SHA-256 fingerprint to support diagnostics.

A change between passes is **fail-closed**, even if both databases
ultimately match. However, this is an optimistic check: concurrent
writes may occur between the second snapshot and the caller's next
action, and a coordinated rewrite could escape detection. There is
no cross-database transaction or trusted external anchor. SHA-256
fingerprints do not constitute signatures. The callback is for
deterministic tests, not an authorization hook.

The result never authorizes model release or deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_concurrent_consistency_v1 -v`

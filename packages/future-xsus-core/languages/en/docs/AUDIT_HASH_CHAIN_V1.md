# Audit Hash Chain V1 — Future XSUS Core

Opt-in owner-scoped SHA-256 hash chain of minimal audit receipts:
candidate ID, increasing audit sequence, review status, ordinal and
previous digest. The chain uses SQLite `BEGIN IMMEDIATE` to serialize
appends and provides read-only verification of links and event hashes.

This is **not yet integrated automatically** with Review Audit V1.
Callers must append only after an audit event is durably recorded
and must verify that the status and sequence match that event.
The chain stores no private prompts or checkpoint bytes.

This is **not an immutable ledger**. A privileged database writer can
rewrite the whole chain. Truncation of the tail requires an external
trusted copy of the expected head to detect reliably. No external
anchoring, signatures, user authentication, deployment or release
authorization are provided.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_hash_chain_v1 -v`

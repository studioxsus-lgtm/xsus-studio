# Audit Chain Tail Recovery V1 — Future XSUS Core

Optional recovery for persisted review audit events that are missing
from the end of the SHA-256 receipt chain. The operation:
1. Reads the owner/candidate audit events (bounded to 1000).
2. Verifies the existing chain's hashes and links.
3. Requires every existing chain receipt to match the audit prefix.
4. Appends only missing tail receipts, then reconciles both stores.

Existing receipts are never rewritten. Empty audit, a mismatched prefix,
corrupt chain, and oversized histories fail closed. Re-running an
already completed recovery appends nothing.

**Limitations:** two separate SQLite databases are not one transaction.
A crash or concurrent append can interrupt recovery; retry only after
inspection. SHA-256 receipts cover sequence and status, not reasons or
timestamps. The chain has no external trust anchor. The operation
does not authenticate owners, authorize model release or delete data.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_chain_recovery_v1 -v`

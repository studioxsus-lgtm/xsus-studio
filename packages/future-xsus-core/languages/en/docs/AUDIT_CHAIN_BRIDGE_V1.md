# Audit Chain Bridge V1 — Future XSUS Core

Optional bridge from a persisted Review Audit V1 event to an
owner-scoped SHA-256 Audit Hash Chain V1 receipt. Reconciliation
compares ordered audit sequence/status pairs with chain rows and
verifies all chain digests and links. It detects unbridged events,
mismatched status, corrupted hashes and an unexpected externally
supplied head.

**Limitations:** the bridge writes to two independent SQLite databases;
there is no atomic cross-database transaction. A crash between audit
persistence and chain append can leave an unbridged event. The bridge
requires the selected audit event to be the latest; recovery of older
unbridged events is not yet supported. Reconciliation deliberately
fails closed at the 1000-row audit history limit. SHA-256 receipts
do not include full audit reasons or timestamps; these fields are
not cryptographically protected by the chain. A privileged writer
can rewrite both databases; externally trusted head anchoring is
not implemented. No release or deployment is authorized.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_chain_bridge_v1 -v`

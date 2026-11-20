# Audit Anchor Continuity V1

Read-only validation of the local versioned checkpoint archive.
Each checkpoint is checked with HMAC-SHA256 and against the
historical prefix of the live chain. Checks include numeric
version ordering, optional consecutive labels beginning with v1,
strictly increasing anchored event counts, and distinct heads.

**Limitations:** This does not prove the completeness of a local
archive: deleting the final version, or deleting and renumbering
all versions with access to the HMAC key, can escape detection.
Versions are not cryptographically chained to each other.
The local archive is not an independent trust boundary. The
underlying audit DB is not cross-checked here; use reconciliation
separately. This is a point-in-time check and never authorizes
release, promotion or deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_anchor_continuity_v1 -v`

# Review Freshness V1 — Future XSUS Core

An opt-in, read-only freshness check for a previously audited staged
candidate review. It compares the expected audit sequence with the
latest owner-scoped audit row, verifies that the row recorded a
successful review, rechecks the current staged artifact and candidate
status, and checks for registry or audit changes during the call.

Results are `fresh_at_check` or `stale_or_blocked`. Freshness is
**not** a release permission and is **not** guaranteed after return.
The registry and audit are separate SQLite databases; the operation
is not atomic across them or the filesystem. It does not authenticate
owners, sign audit rows, lock files, activate models or delete data.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_review_freshness_v1 -v`

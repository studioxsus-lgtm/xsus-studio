# Review Audit V1 — Future XSUS Core

The optional `SQLiteReviewAuditV1` records the results of
staged candidate review checks in persistent, owner-scoped SQLite.
Each event stores only the candidate ID, status, reason codes and
timestamp; no feedback prompts or checkpoint bytes are recorded.
`assess_and_audit_staged_review_v1` runs the review gate then
persists the result before returning it to the caller.

Audit is **not** cryptographically signed, tamper-evident or an
authorization mechanism. It does not authenticate the owner,
guarantee a review result remains valid, or enable deployment.
Only the opt-in wrapper records events; direct calls to the
review gate remain unaudited.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_review_audit_v1 -v`

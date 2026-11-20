# Staged Review Gate V1 — Future XSUS Core

The opt-in `assess_staged_review_v1` function verifies a candidate
is registered for the specified owner, still pending human review,
and has a staged artifact whose SHA-256 matches its candidate ID.
Missing, changed or unreadable artifacts fail closed with a reason.
Revocation after staging also blocks review.

This is a **point-in-time advisory review gate**, not a release
permission. It does not approve deployment, authenticate owners,
lock files, store audit events, or continuously monitor revocations.
Callers must recheck before any sensitive action and enforce the
decision at their own boundary.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_staged_review_gate_v1 -v`

# Audit Consistency V1 — Future XSUS Core

The optional read-only `inspect_review_audit_consistency_v1` checks
all audit events for one owner and candidate within a single SQLite
read transaction. It validates ascending event IDs, allowed status
values, JSON reason encoding, status/reason consistency, parseable
timezone-aware timestamps and nondecreasing timestamps. An optional
expected latest sequence detects a changed latest event ID.

This is **structural validation only**: SQLite rows are not signed,
hash-chained or protected against malicious rewriting or deletion.
Sequence gaps may be normal because the audit table is shared among
different owners/candidates; they are not treated as corruption.
The checker does not authorize release, authenticate owners or
modify stored data. A check is only valid at the time performed.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_consistency_v1 -v`

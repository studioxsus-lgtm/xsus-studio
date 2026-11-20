# Audit Chain Recovery V2 — Future XSUS Core

This optional recovery implementation holds SQLite `BEGIN IMMEDIATE`
on the **chain database** while verifying the existing receipt prefix
and appending missing audit events. Concurrent recovery calls serialize
and do not duplicate receipts. An exception rolls back all writes
from that recovery call. Re-running after a successful commit is
idempotent. Existing receipts are never overwritten.

The audit database is separate: its snapshot is taken before the
chain write transaction, and reconciliation after commit may report
a newly appended audit event. There is no atomicity across databases,
no external cryptographic anchor, no protection from privileged
database rewrites, and no release authorization. Tests exercise
thread-level concurrent calls, not a comprehensive process-kill or
multi-host crash simulation.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_chain_recovery_v2 -v`

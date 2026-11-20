# Audit Chain Multiprocess V1 — Future XSUS Core

This test suite launches independent Python interpreter processes
against the same SQLite audit and chain files. It exercises concurrent
tail recovery, exactly-once receipt insertion across competing
processes, idempotent retries, mixed review statuses, ordinal
continuity, and persisted hash integrity after reopening the chain.

The implementation under test is `recover_audit_chain_tail_v2`,
which serializes chain writes using SQLite `BEGIN IMMEDIATE`.
The tests do not claim distributed multi-host locking, fairness,
hardware crash durability, or atomicity across the two databases.
A separate trusted head anchor remains necessary for robust
truncation detection. No model release is authorized.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_chain_multiprocess_v1 -v`

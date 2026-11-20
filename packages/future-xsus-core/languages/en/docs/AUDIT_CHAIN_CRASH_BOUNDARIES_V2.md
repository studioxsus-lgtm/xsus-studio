# Audit Chain Crash Boundaries V2

POSIX subprocess tests terminate a worker with SIGKILL at three
specific boundaries: after beginning a SQLite write transaction but
before insert; after insert but before commit; and after commit.
They verify rollback of uncommitted changes, durability after
commit under process termination, release of database locks,
chain hash integrity, and idempotent recovery after restart.

These tests use controlled process termination, not power loss,
disk corruption, or hardware failure simulation. They do not
guarantee atomicity between the separate audit and chain databases.
No model release is authorized.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_chain_crash_boundaries_v2 -v`

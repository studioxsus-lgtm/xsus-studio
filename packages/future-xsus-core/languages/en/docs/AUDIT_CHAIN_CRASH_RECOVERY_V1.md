# Audit Chain Crash Recovery Tests V1

The subprocess test suite uses a separate Python interpreter and
POSIX SIGKILL while a SQLite `BEGIN IMMEDIATE` transaction is
uncommitted. It verifies rollback of uncommitted inserts/deletes,
release of the write lock, preservation of the previous chain head,
idempotent recovery, and recovery after reopening the database.

This is crash **injection**, not a claim of exhaustive crash safety:
it does not test power loss, fsync behavior, all transaction
boundaries, multi-host coordination, or two-database atomicity.
SIGKILL tests skip on non-POSIX platforms.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_chain_crash_recovery_v1 -v`

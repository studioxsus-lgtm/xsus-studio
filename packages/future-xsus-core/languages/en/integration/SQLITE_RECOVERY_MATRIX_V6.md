# SQLite V6 — expanded recovery and isolation matrix

This test increment adds subprocess crash-boundary scenarios and SQLite
isolation regressions. The crash suite distinguishes a committed
reservation (retained after `os._exit`), an uncommitted transaction
(rolled back after `os._exit`), and a committed release (retained).

Isolation tests cover composite keys, token-bound release, expiry
boundaries, malformed inputs, and SQL metacharacters treated as data.

All databases are temporary files under the test runner. No external
services, production credentials or XSUS App integration are used.

**Limits:** this is local SQLite crash testing, not power-loss simulation,
filesystem corruption testing, multi-host correctness, or durable
distributed fencing. SQLite journal/fsync configuration and operational
backup/restore must be assessed separately before production use.

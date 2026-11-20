# SQLite lease store V6 — experimental

`SQLiteLeaseStoreV6` is a file-backed, local prototype for reservation
persistence. `BEGIN IMMEDIATE` serializes reservation transactions,
a composite primary key rejects duplicates, and a token-conditioned
DELETE prevents stale-owner release. Reopening the database retains
unexpired reservations. The implementation intentionally has no global
capacity limit and does not provide the `capacity` status.

This is **not** a production distributed lease service. SQLite is used
only in local temporary test files. No Redis, Supabase, Render, or XSUS
App production connection is configured. Expiry depends on caller-supplied
time; use a trusted time source in any future deployment. There is no
renewal, fencing, result cache, or multi-host failure validation.

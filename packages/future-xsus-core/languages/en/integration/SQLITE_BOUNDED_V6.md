# Bounded SQLite lease store V6 — experimental

`SQLiteBoundedLeaseStoreV6(path, max_entries=N)` provides atomic
capacity enforcement in a single local SQLite file. A `BEGIN IMMEDIATE`
transaction removes expired rows, checks duplicates, checks active row
count, and inserts the reservation. Status values are `reserved`,
`duplicate`, and `capacity`. The owner token is returned only for
successful reservations. Release inherits token-conditioned deletion.

The capacity configuration is persisted per database and incompatible
subsequent configurations are rejected. The maximum is per database,
not per tenant or user. This class is an opt-in alternative to the
unbounded SQLite prototype and does not change the existing backend.

Limitations: no per-subject quotas, fairness guarantees, network
filesystem support, multi-host fencing, trusted clock, or production
rate limiting. SQLite operations are local only. No production
XSUS App route or external database is changed.

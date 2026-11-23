# Phase 45 — PostgreSQL lease store

This backend-only adapter implements `read`, `createIfAbsent` and `compareAndSwap` for the Phase 44 lease manager, using parameterized SQL and conditional UPDATE of all previous row fields. It is compatible with the **draft** `postgres-lease-schema.sql` but does not apply that migration.

Use a trusted PostgreSQL query executor that enforces the same database and role for all calls. Concurrent inserts and CAS updates are delegated to PostgreSQL's unique constraint and atomic UPDATE semantics.

**Production blockers:** The Phase 44 manager computes expiry with its injected worker clock, not authoritative PostgreSQL time. The CAS adapter does not independently check database-time expiration and must not be used to authorize host operations. A separate authoritative lease check and host-enforced fencing must be developed; the manager and store are currently a persistence contract, not a distributed lock guarantee. An expired lease does not mean a container stopped. No database connection, migration, role grants, or live integration tests were executed.

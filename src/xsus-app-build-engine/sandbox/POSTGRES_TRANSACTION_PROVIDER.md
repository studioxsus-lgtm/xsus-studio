# Phase 39 — PostgreSQL transaction provider

A backend-only provider now supplies a single dedicated PostgreSQL client for BEGIN, SELECT ... FOR UPDATE, conditional UPDATE, audit INSERT, COMMIT and ROLLBACK. It releases the client in finally and reports rollback failure. SQL values are parameterized. The audit table SQL is a **draft**, not an applied migration.

The adapter must use a trusted connection pool's `connect()` method returning a dedicated client; do not substitute independent pool.query calls. The existing registration path does not yet atomically create the first audit event, so the transactional transition coordinator cannot operate on registrations created through that older path without a trusted bootstrap migration. A real PostgreSQL instance, a least-privilege backend role, appropriate RLS policies, database constraints, transaction failure tests and durable external audit checkpoints are required before production use.

The tests mock the PostgreSQL client and do not verify database isolation, persistence or actual SQL execution.

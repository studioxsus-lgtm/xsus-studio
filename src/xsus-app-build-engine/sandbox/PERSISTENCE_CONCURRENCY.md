# Phase 36 — Database integration and concurrency verification

The execution-persistence module wires the Phase 35 PostgreSQL store to the Phase 34 execution registry. The accompanying integration tests use a deterministic in-memory SQL adapter to simulate duplicate inserts, optimistic CAS conflicts, ownership checks, registry recreation and recovery races.

**Important:** these are simulated SQL contract tests, not actual PostgreSQL integration tests. Registry recreation against the same fake database does not prove persistence across a real process restart or database failure. No production database schema has been deployed or modified. Real verification still requires a restricted backend PostgreSQL role, reviewed RLS/grants, migration approval, concurrent transactions on a real PostgreSQL instance, restart/failover tests and audit logs.

Do not enable destructive recovery until the host-side fencing and container ownership checks are implemented.

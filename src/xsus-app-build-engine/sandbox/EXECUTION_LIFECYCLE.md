# Phase 41 — Execution lifecycle integration

The lifecycle facade composes Phase 40 atomic registration, Phase 39 PostgreSQL transaction provider and Phase 38 transactional audit coordinator. It exposes register, start, complete, fail, authorizeRecovery, markCleaned and inspect. State transitions require an explicit current revision/fence and are checked against the stored record under a transaction.

The integration tests simulate PostgreSQL SQL statements in memory. No live PostgreSQL or Docker runtime is invoked; no deployment or database migration was performed. The facade does not yet verify the entire audit chain, authenticate caller identity independently, execute containers, enforce a durable recovery lease or bind host cleanup to a fencing token. An execution marked cleaned is **not** evidence that any container or staged artifacts were actually removed.

For production: use only this atomic registration path, a restricted server-side connection pool, reviewed migrations and RLS, real concurrency tests, independent audit checkpoints, and host-side cleanup receipts before enabling recovery.

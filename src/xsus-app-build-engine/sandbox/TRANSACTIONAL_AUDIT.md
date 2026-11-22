# Phase 38 — Transactional execution audit coordination

Adds a backend-only transition coordinator that requires the execution state and corresponding audit event to be committed in **one trusted transaction**. The transaction provider must acquire a database row lock for the execution, read its audit head under the same transaction, conditionally update state/revision/fence, append the audit event and commit both or roll back both.

The coordinator rejects mismatched owners, stale revisions, illegal transitions, mismatched audit heads and failed writes. Its hash format is compatible with Phase 37's canonical event representation.

**Not yet a PostgreSQL transaction implementation.** The test transaction provider simulates atomic commit/rollback in memory. The production provider must use one dedicated database connection with BEGIN, SELECT ... FOR UPDATE, conditional UPDATE, INSERT, COMMIT/ROLLBACK; it must not use unrelated pooled queries inside a transaction. The initial registration and its first audit entry must also be written atomically; existing Phase 34/35 registration is not yet linked to audit. No production recovery approval or host cleanup should rely on this coordinator until those missing integrations and real concurrency tests are completed.

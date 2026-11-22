# Phase 40 — Atomic execution registration

The new backend-only registration entry point creates an execution row and the genesis audit event within one PostgreSQL transaction on a dedicated client. It uses the same canonical SHA-256 event format as Phase 37. Duplicate IDs and failed audit writes trigger rollback, and the client is released in a finally block.

**Integration rule:** callers requiring auditable execution history must use this registration entry point, not the older Phase 34 `registry.register` / Phase 35 `store.createIfAbsent` paths. Those legacy entry points remain available and can still create unaudited rows; routing and eventual deprecation must be addressed before production. This does not modify an active database or deploy SQL. The transaction and audit schema are drafts pending controlled migration and least-privilege role/RLS review.

Tests use mocked database clients. Actual PostgreSQL transaction, crash and concurrent registration tests remain outstanding. A COMMIT transport failure can leave commit outcome unknown; callers must query by execution ID before retrying, rather than assuming rollback succeeded. Host-side fencing and recovery remain separate security requirements.

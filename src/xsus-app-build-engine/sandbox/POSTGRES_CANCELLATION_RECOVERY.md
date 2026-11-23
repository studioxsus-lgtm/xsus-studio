# Phase 60 — PostgreSQL cancellation recovery persistence

A PostgreSQL-backed adapter for the Phase 59 receipt store interface. Parameterized SELECT, INSERT ON CONFLICT DO NOTHING, and optimistic conditional UPDATE enforce an uncertain-to-reviewed transition with increasing revision and evidence references. Malformed rows and unsafe bigint revisions fail closed. A draft schema includes primary key, state constraints, ENABLE/FORCE RLS and revoked public/client roles.

This is **not a deployed migration**. The service requires an existing execution row, a dedicated authorized backend role and real PostgreSQL concurrency tests. Reviewed does not prove physical termination or safe recovery. Do not expose this table to browser clients. No live database, Docker or Render operation was performed. Tests use mocked SQL.

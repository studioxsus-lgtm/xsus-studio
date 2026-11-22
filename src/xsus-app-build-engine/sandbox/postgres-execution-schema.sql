-- REVIEW ONLY: apply through a controlled, audited database migration.
-- Internal schema is not exposed through Supabase Data API.
CREATE SCHEMA IF NOT EXISTS xsus_internal;
CREATE TABLE IF NOT EXISTS xsus_internal.build_executions (
 execution_id text PRIMARY KEY CHECK (execution_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
 owner_id text NOT NULL CHECK (owner_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
 state text NOT NULL CHECK (state IN ('registered','running','completed','failed','recovering','cleaned')),
 revision bigint NOT NULL CHECK (revision >= 1),
 fence bigint NOT NULL CHECK (fence >= 1),
 updated_at_ms bigint NOT NULL CHECK (updated_at_ms >= 0)
);
ALTER TABLE xsus_internal.build_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xsus_internal.build_executions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA xsus_internal FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE xsus_internal.build_executions FROM PUBLIC, anon, authenticated;
-- Grant only a dedicated least-privilege backend database role after security review.

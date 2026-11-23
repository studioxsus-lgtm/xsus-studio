-- REVIEW ONLY. Apply through an approved backend-only migration.
CREATE TABLE IF NOT EXISTS xsus_internal.build_execution_leases (
 execution_id text PRIMARY KEY REFERENCES xsus_internal.build_executions(execution_id),
 holder_id text NOT NULL CHECK (holder_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
 fence bigint NOT NULL CHECK (fence >= 1),
 expires_at_ms bigint NOT NULL CHECK (expires_at_ms >= 0)
);
ALTER TABLE xsus_internal.build_execution_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE xsus_internal.build_execution_leases FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE xsus_internal.build_execution_leases FROM PUBLIC, anon, authenticated;
-- Implement atomic createIfAbsent / compareAndSwap on a dedicated backend role.
-- Lease fence is separate from execution revision/fence and must not be conflated.

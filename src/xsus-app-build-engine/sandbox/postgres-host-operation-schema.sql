-- Phase 52: draft only. Apply only via reviewed privileged migration.
CREATE SCHEMA IF NOT EXISTS xsus_internal;
CREATE TABLE IF NOT EXISTS xsus_internal.build_host_operations (
 execution_id text NOT NULL REFERENCES xsus_internal.build_executions(execution_id),
 operation_id text NOT NULL,
 holder_id text NOT NULL,
 fence bigint NOT NULL CHECK (fence > 0),
 operation text NOT NULL CHECK (operation IN ('launch','stop','cleanup')),
 status text NOT NULL CHECK (status IN ('pending','applied','uncertain')),
 PRIMARY KEY (execution_id,operation_id)
);
ALTER TABLE xsus_internal.build_host_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE xsus_internal.build_host_operations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON xsus_internal.build_host_operations FROM PUBLIC, anon, authenticated;
-- Dedicated service-role privileges and audited policies must be configured separately.

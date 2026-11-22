-- DRAFT ONLY. Do not apply without migration, role, and RLS review.
-- Registration must atomically create the execution and the sequence=1 audit event.
CREATE TABLE IF NOT EXISTS xsus_internal.build_execution_audit (
 execution_id text NOT NULL REFERENCES xsus_internal.build_executions(execution_id),
 sequence bigint NOT NULL CHECK (sequence >= 1),
 revision bigint NOT NULL CHECK (revision = sequence),
 fence bigint NOT NULL CHECK (fence = sequence),
 from_state text,
 to_state text NOT NULL CHECK (to_state IN ('registered','running','completed','failed','recovering','cleaned')),
 timestamp_ms bigint NOT NULL CHECK (timestamp_ms >= 0),
 previous_hash text NOT NULL CHECK (previous_hash ~ '^[a-f0-9]{64}$'),
 hash text NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
 version text NOT NULL,
 PRIMARY KEY (execution_id,sequence)
);
ALTER TABLE xsus_internal.build_execution_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE xsus_internal.build_execution_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE xsus_internal.build_execution_audit FROM PUBLIC, anon, authenticated;
-- Dedicated backend database role and explicit access policies are not provisioned.

-- Phase 60: reviewed migration draft only. Not applied.
CREATE SCHEMA IF NOT EXISTS xsus_internal;
CREATE TABLE IF NOT EXISTS xsus_internal.build_cancellation_receipts (
 execution_id text NOT NULL REFERENCES xsus_internal.build_executions(execution_id),
 operation_id text NOT NULL,
 reason text NOT NULL CHECK (reason IN ('timeout','external-cancellation','lock-lost','process-failure')),
 stop_requested boolean NOT NULL,
 status text NOT NULL CHECK (status IN ('uncertain','reviewed')),
 revision bigint NOT NULL CHECK (revision >= 1),
 reviewer_id text,
 evidence_id text,
 PRIMARY KEY (execution_id,operation_id),
 CONSTRAINT reviewed_evidence CHECK (
  (status='uncertain' AND reviewer_id IS NULL AND evidence_id IS NULL)
  OR (status='reviewed' AND reviewer_id IS NOT NULL AND evidence_id IS NOT NULL)
 )
);
ALTER TABLE xsus_internal.build_cancellation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xsus_internal.build_cancellation_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON xsus_internal.build_cancellation_receipts FROM PUBLIC, anon, authenticated;
-- Apply privileges only to an audited, dedicated backend principal.

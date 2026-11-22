# Phase 33 — Runtime recovery coordinator

This module introduces a fail-closed recovery inventory and explicit-approval cleanup contract for XSUS sandbox resources. It filters only XSUS-prefixed containers, correlates them with staging execution IDs, excludes active executions, defaults to dry-run and requires explicit approved IDs before any destructive operation. Container cleanup precedes staging cleanup; a failed container removal blocks staging removal.

**Not a crash-safe recovery service yet:** the inventory providers, activity source and removal operations are injected and must be trusted. Active status must come from durable leases with fencing, not a process-local boolean; a stale result can otherwise race with a newly started execution. Recovery must also use ownership labels and verified container identity, not names alone. No automated destructive cleanup should be enabled until those safeguards, audit logging, persistence and real-host integration tests exist.

The integration tests use fakes and do not operate on Docker or the host staging filesystem.

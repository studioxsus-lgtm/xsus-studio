# Lease lifecycle V6 (experimental)

`run_lease_lifecycle_suite_v6` is a deterministic, mutating conformance
test for isolated stores. It verifies duplicate rejection immediately
before expiry, replacement at the expiry boundary, stale-owner rejection,
owner release, and re-reservation. Acquired leases are released in a
`finally` block where possible.

This is **not** a crash-recovery or distributed-safety certification.
The test passes synthetic timestamps to the backend and does not kill
workers, restart a database, or exercise clock skew across hosts.
Real Redis/PostgreSQL backends require separate integration tests,
including worker termination, durable recovery, multi-host contention,
and fencing of operations that outlive their lease.

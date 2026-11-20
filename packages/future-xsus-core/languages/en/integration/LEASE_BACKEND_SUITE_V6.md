# Lease backend conformance suite V6

The opt-in `run_lease_backend_suite_v6` executes six behavioral checks
against a supplied store using randomly namespaced keys. It checks first
reservation, duplicate rejection, wrong-owner rejection, key isolation,
owner release and stale-owner rejection. It releases acquired leases in
a `finally` block, including when assertions fail.

Use only against an isolated test database/namespace. The suite mutates
its backend and is not safe to run against production storage.

Passing does not prove cross-process atomicity, crash recovery, clock
consistency, TTL expiry, network reliability, or distributed fencing.
Those require independent integration and fault-injection tests with a
real backend. No Redis/PostgreSQL connection is configured here.

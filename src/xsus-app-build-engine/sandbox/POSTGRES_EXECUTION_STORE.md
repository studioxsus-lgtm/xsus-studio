# Phase 35 — Persistent execution storage contract

Implements the existing durable execution registry's three storage methods using parameterized PostgreSQL INSERT/SELECT/conditional UPDATE. The schema draft places records in a private schema, enables FORCE RLS and revokes public/anon/authenticated access. Only a trusted backend with an explicitly configured least-privilege database role may access it.

The SQL schema is **not deployed** and no live database was modified. A database role with appropriate permissions and a carefully reviewed RLS policy or internal access model is required; FORCE RLS without a matching policy will deny ordinary roles. The query function must be a trusted server-side PostgreSQL adapter; do not expose it to browsers. Production validation requires actual database concurrency tests, process-restart persistence, ownership checks, migration review, backups, audit logging and authorization of the backend role.

This implementation provides atomic compare-and-swap semantics if PostgreSQL enforces the conditional UPDATE, but does not by itself establish a safe crash-recovery or host-isolation service.

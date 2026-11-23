# Phase 72 — PostgreSQL project persistence integration

Read-only inspection of the active Supabase project `Xsusstudio-central` confirmed public.projects with UUID id/owner_id, JSONB content, and updated_at; public.project_versions and public.xsus_builder_projects also exist. No database mutation was performed.

This server-side adapter reads owner-scoped project records and stores only the last build metadata under `content.lastBuild` via parameterized UPDATE. It requires an injected, trusted per-project authorization function and a server-side PostgreSQL query function. Never use a browser service_role key, and never accept an ownerId supplied by an untrusted client without authenticating it.

This is **not** a deployed connection. It does not implement durable idempotency, cross-host fencing, or an immutable build history. A production deployment must verify RLS and privileges for the exact DB role, implement real backend authentication, and run integration tests against an isolated test project before enabling writes. Concurrent lastBuild updates are last-writer-wins; immutable receipts belong in the separate operation ledger.

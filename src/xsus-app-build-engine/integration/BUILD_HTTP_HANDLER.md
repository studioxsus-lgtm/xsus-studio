# Phase 73 — XSUS App backend build HTTP contract

A transport-independent POST handler validates the authenticated user, project ownership, build request and sanitized result. The owner ID is derived exclusively from the authenticated principal, never the browser payload. It refuses unexpected fields and does not disclose runtime errors.

**This is not a live Render endpoint.** The handler must be mounted by the existing server with verified Supabase JWT authentication, owner-scoped database authorization, durable claim and host fencing, a trusted runtime, request size/rate limits, TLS and appropriate operational logging. Never expose the Phase 68 non-durable engine directly in production. No Render service was selected or deployed. No database changes were made. Unit/integration mocks do not demonstrate a functioning build.

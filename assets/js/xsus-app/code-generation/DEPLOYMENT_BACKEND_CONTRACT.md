# XSUS App — Deployment Backend Contract v1.0.0

Status: **contract specification only; no production deployment backend connected**.

## Boundary
The browser can prepare and download a static hosting plan. It cannot authorize a deployment, authenticate a user to the target provider, or claim deployment success. Browser acknowledgement and PREPARE confirmation are UI-only consent for plan export.

## Request
Use `createDeploymentRequest(plan, projectId)` to generate a strictly `validate-only` request. It contains a version, operation, project identifier, allowlisted target, and three SHA-256 integrity records. Never include access tokens, cookies, provider credentials, user roles or claims of approval in the request body.

## Trusted backend responsibilities
1. Authenticate the user through a verified server-side session and apply project ownership/role authorization.
2. Recompute SHA-256 from trusted build artifacts, rather than trusting client-supplied hashes.
3. Validate provider allowlists, repository/site ownership, target-specific permissions, quotas, and the exact destination.
4. Apply CSRF protection where cookie-based authentication is used, rate limiting, audit logging with sensitive data redaction, and idempotency keys.
5. Separate review/approval from deployment execution. Require explicit scoped server-side approval for a specific immutable artifact and destination.
6. Store provider secrets only in backend-managed secret storage. Never return tokens to the browser.
7. Record verifiable execution receipts and report deployment status only after confirmation from the provider.

## Response
`validateDeploymentResponse(response)` accepts only a `deployment.request` response with version `1.0.0`, status `denied`, `validation-required`, or `approved-for-review`, and `deployed: false`. This contract cannot represent a completed deployment.

## Failure mode
When no authenticated backend is configured, `offlineDeploymentDecision()` returns `denied` with `deployed:false`. Never silently switch to browser-side provider calls.

## Phase 14.8: trusted validation service scaffold
`services/src/deployment/deployment-validation-service.js` exports `validateDeploymentRequest(request, context)`. It is a Node.js server-side library, not an HTTP route and not connected to Render or Supabase. It requires three independently implemented trusted callbacks: `authenticate()`, `authorizeProject(identity, projectId, target)`, and `loadTrustedFiles(identity, projectId)`. Missing callbacks, authentication failures, authorization failures, missing files, and checksum mismatches fail closed. It recomputes SHA-256 from trusted UTF-8 file contents and returns `approved-for-review` only; it never publishes.

**Production integration gate:** Before exposing an HTTP route, wire these callbacks to verified Supabase authentication, authoritative project ownership checks, and a trusted artifact store. Add request size limits, rate limiting, CSRF defenses where applicable, audit logging, idempotency, destination ownership checks, and authenticated approval. Do not pass browser-supplied identity into the trusted context. Do not expose a deploy action until separate execution and rollback mechanisms are reviewed.

## Phase 14.9: Supabase identity and project ownership adapter
`services/src/deployment/supabase-project-authorization.js` exports `createSupabaseDeploymentContext({authClient,projectStore,artifactStore,accessToken})`. The adapter uses `authClient.auth.getUser(accessToken)` to obtain a server-verified user identity. It requires `projectStore.findOwnedProject({projectId,ownerId})` and `artifactStore.loadFiles({projectId,ownerId})` from trusted server-side integrations. Ownership is checked before validation and again before loading trusted artifacts.

**Not yet wired:** The repository's authoritative project table/columns, artifact storage mapping, HTTP authentication middleware, and Render server entry point have not been established by this adapter. It does not provision a Supabase client, infer schema, deploy an app, or change RLS. The injected project store must enforce ownership in its database query; the artifact store must only return server-trusted project files. Never pass a service-role key or access token to the browser. Add verified endpoint integration and integration tests against the actual schema before enabling network requests.

## Phase 15.0: HTTP validation handler scaffold
`services/src/deployment/deployment-http-handler.js` exports `handleDeploymentValidationHttp(input, dependencies)`. The framework-neutral handler accepts only POST JSON with an allowlisted Origin, Bearer token, and a maximum 16 KiB request body. It delegates identity, project ownership, and trusted SHA-256 checks to the Phase 14.9 and 14.8 adapters. It returns a status, response headers and body; **it is not mounted on a live HTTP server**. Successful validation means `approved-for-review` with `deployed:false`, not permission to execute.

**Before deployment:** Add a production router binding, verified trusted Supabase clients and authoritative project/artifact stores, server-side rate limiting, origin configuration, request tracing, idempotency and audit controls. Never treat the Origin header as authentication or authorization. This handler must not be exposed as a deployment-execution endpoint.

## Phase 15.1: Node HTTP adapter (not yet mounted)
`services/src/deployment/deployment-node-adapter.js` exports `createDeploymentNodeHandler(dependencies)`. It handles only `POST /api/deployments/validate`, streams a maximum 16 KiB JSON body, and delegates to the existing authenticated validation handler. It does not open a port, attach to a running Render service, create credentials, or execute deployments. Test coverage is in `tests/unit/xsus-app-deployment-node-adapter.test.js`.

**Production integration remains blocked** until the user confirms the correct Render workspace and service and the actual server entry point and Supabase project/artifact schema are inspected. Do not mount the route blindly or trigger a deployment without those checks.

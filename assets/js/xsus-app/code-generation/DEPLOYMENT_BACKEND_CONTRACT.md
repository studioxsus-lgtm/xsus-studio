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

# Hyper XSUS Core — production completion gates

Status: implementation plan, **not** production certification.

## Ownership and boundaries

- `platform/xsus-app/`: XSUS App ↔ Hyper transport, policy, contracts and reference authorization/dispatcher. Do not move the Hyper engine implementation into the browser.
- Hyper engine implementation: retain its existing independent module/repository boundary; locate and audit the authoritative engine source before adding executors.
- `tests/integration/`: adapter, authorization, dispatcher and HTTP contract regression tests.
- Render backend: verified JWT authentication, RLS-backed project ownership, operation authorization and actual executors. Never expose service-role secrets to browser code.
- Supabase: authentication, project ownership and persistence under enforced RLS.
- XSUS AI Core: remains independent; no implicit fallback.

## Verified source-code baseline

- `xsus-engine-policy.js` explicitly enables `evidence.verify` and disables `application.plan`, `application.build`, `application.execute` and language routing.
- `xsus-hyper-application-contract.js` validates plan/build requests and strips unapproved response fields, including optional `artifactId`.
- `xsus-hyper-application-authorization.js`, `xsus-hyper-application-dispatcher.js` and `xsus-hyper-application-http.js` are **reference compositions, not deployed endpoints**.
- A passing contract test does not demonstrate real application generation.

## Completion sequence

1. Inventory authoritative Hyper engine source, entrypoints, dependencies, versions, tests and deployment ownership.
2. Audit Knowledge Graph/Link, audit persistence, recovery, integrity, and concurrency with actual test results and commit SHA.
3. Implement isolated `application.plan` executor in the Hyper backend; require a structured plan, deterministic validation and project-scoped authorization.
4. Implement isolated `application.build` executor with bounded workspace, path traversal protection, artifact provenance and atomic persistence.
5. Implement sandboxed execution/build checks with explicit resource, network, filesystem and time limits. Do not execute arbitrary generated code in the API process.
6. Wire verified server dependencies in Render; keep the browser gateway disabled until authenticated end-to-end acceptance passes.
7. Verify JWT expiration, cross-user isolation, RLS, operation permissions, secret leakage, retries, failure recovery and rollback.
8. Test XSUS App ↔ Hyper from a real authenticated browser session, then enable capabilities one by one with rollback flags.
9. Re-run targeted and full regression suites; record exact commands, counts, failures, commit SHA and live deployment identity.

## Release rule

Do **not** set `hyperApplicationExecutionEnabled: true` or return build artifact IDs from the public gateway until the deployed backend, authorization, ownership checks, artifact contract and live acceptance tests have all been verified. Never declare the full Hyper Core complete from isolated green tests.

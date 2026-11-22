# Phase 12.5 — Future ↔ Hyper coordination (development branch)

## Implemented
- `phase-12-5.js`: validates Future language output, validates non-executable Hyper draft plans, detects dependency cycles, rejects explicit private state fields, and coordinates sequentially.
- `router.js`: explicit allowlisted capability registry, dependency-injected adapters, per-engine timeouts, cancellation, and sanitized failures.
- Tests: `tests/core-coordination/phase-12-5.test.js` and `tests/core-coordination/router.test.js`.

## Boundary
This is a development contract, not a production integration. No HTTP routes, credentials, database connections, automatic execution, or public XSUS App wiring are introduced. The existing XSUS App bridge remains untouched. Future and Hyper adapters must be connected to verified server-side entrypoints before any production claim.

## Contract
- Future adapter: `reviewLanguage({text, signal})` returns `{core:"future-xsus-core",text,status,review_required:false}`.
- Hyper adapter: `createDraftPlan({goal, signal})` returns `{core:"hyper-xsus-core",state:"draft",executable:false,dependencyGraphValid:true,steps:[{id,task,dependsOn:[]}]}`.
- Router: `createCoordinationRouter({future,hyper,timeoutMs}).dispatch({operation,goal,signal})`.
- Supported operations: `language.review` and `application.plan`. Unsupported operations fail closed.
- An adapter timeout rejects the request and aborts the adapter signal. Adapter implementations must honor cancellation; an external side effect cannot be undone by the router.
- The current validators explicitly reject selected sensitive field names but are not a recursive data-loss-prevention system. Only the validated, projected response fields are forwarded.
- No shared memory is passed between cores.

## Verification required
1. Run `npx vitest run tests/core-coordination/phase-12-5.test.js tests/core-coordination/router.test.js`.
2. Run full repository regression in GitHub Actions on this branch.
3. Audit real adapter signatures and authenticate server-side routes.
4. Add integration tests with the actual Future and Hyper entrypoints, including failures and latency.
5. Do not merge into main or enable the public UI before approval and green CI.

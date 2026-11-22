# XSUS App — isolated deployment validation service

This Node.js service is **independent of XSUS AI Core**. It does not import or modify `server.js`, the `feature/xsus-ai-core` branch, or the existing Render `xsus-studio` service.

## Local startup
From repository root (Node 20+):

```sh
PORT=3001 XSUS_APP_ALLOWED_ORIGINS=https://www.xsusstudio.com node services/src/deployment/standalone-server.js
```

`GET /healthz` responds with `deploymentEnabled:false`. `POST /api/deployments/validate` remains fail-closed (503) until trusted Supabase clients, authoritative project ownership queries and trusted artifact storage are injected. No endpoint can execute deployments.

## Existing Render service (created, verified live on initial deployment)
- Name: `xsus-app-deployment-api`
- Repository: `studioxsus-lgtm/xsus-studio`
- Branch: `main`
- Runtime: Node.js 20+
- Current root directory: repository root (isolation change not yet applied)
- Current build command: `npm install`
- Current start command: `node services/src/deployment/standalone-server.js`
- Health check: `/healthz`
- Environment: `XSUS_APP_ALLOWED_ORIGINS=https://www.xsusstudio.com` (no provider secrets until backend integration is audited)

Do **not** repoint or redeploy existing `xsus-studio` or `future-xsus-core-api` services. The current API is validation-only and not production-ready for authorization until trusted dependencies and rate limits are configured. Avoid treating a passing health check as deployment authorization.

## Phase 15.5 — dependency isolation and smoke tests
The standalone service now has its own `services/src/deployment/package.json` with **zero declared third-party runtime dependencies**. From that directory run `node --test tests/*.node-test.js` or `npm test`. This does not mean the existing root dependency audit is resolved: Render currently runs `npm install` at repository root, and the initial deployment reported **2 critical and 1 moderate** npm audit findings. Their package identities and exploitability have not been established.

For a future **isolated** build of this service, use Render root directory `services/src/deployment`, build command `npm install --omit=dev`, start command `npm start`, and health path `/healthz`. Do not apply these settings to existing XSUS AI Core or Future XSUS Core services. This proposed change needs a reviewed redeployment of only `xsus-app-deployment-api`. Its production authorization remains disabled until trusted project and artifact stores are implemented.

## Phase 15.8 — reviewed Render settings, not yet applied
The manual live-smoke workflow was reported passing on main. The current Render deployment still uses repository-root `npm install`; a successful HTTP smoke test does **not** establish that root dependencies are safe.

The separate `render-service.yaml` is a **reference configuration**, not an applied Blueprint. Change **only** the existing `xsus-app-deployment-api` service's Root Directory to `services/src/deployment`, Build Command to `npm install --omit=dev`, Start Command to `npm start`, and Health Check Path to `/healthz`. Leave auto-deploy off. After redeploying that service, rerun the live smoke workflow and check its build logs for dependency audit findings. Do not change the `xsus-studio` or `future-xsus-core-api` services.

### Supabase integration gate
No database schema or trusted artifact store has yet been verified. Do not add a service-role key or enable authorization solely on the strength of the smoke test. Before wiring the backend, confirm table and storage policies, ownership enforcement, secret handling, and rate limits; then add integration tests using a dedicated test project. The endpoint must remain validation-only and fail-closed until these checks pass.

## Phase 15.9 — security regression gates
Nine isolated Node HTTP tests now cover health, route separation, methods, authentication gate, missing trusted backend, untrusted origins, oversized bodies, and unsupported content types. The manually triggered live-smoke workflow additionally probes these rejection cases against the deployed service without credentials or state-changing operations. The live-smoke test is **not** a substitute for project ownership and Supabase RLS integration tests.

These changes affect only the XSUS App deployment service tests and documentation. They do not change the Render service settings or trigger a deploy (auto-deploy is disabled). After applying the isolated Render root-directory settings and redeploying this service alone, rerun the manual live smoke and verify the results.

## Phase 16.0 — identity invalidation and ownership boundary
The Supabase adapter now invalidates any cached verified identity **before** each new `getUser(accessToken)` call. A failed reauthentication therefore cannot reuse a previously verified identity. Six isolated Node tests cover ownership, cross-user denial, forged identities, invalid identifiers/targets, and expired-token invalidation. They run in the independent XSUS App API CI job and are not Vitest files.

**Important:** these are unit tests with injected fake clients/stores, not live Supabase RLS or artifact-store verification. The current Render service still has no trusted Supabase dependencies injected, and the validation endpoint remains fail-closed. Before enabling production integration, inspect the actual database schema, project owner column, RLS policies, storage permissions, token handling and rate limiting. Never add secrets to source control.

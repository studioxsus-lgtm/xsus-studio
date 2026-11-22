# XSUS App — isolated deployment validation service

This Node.js service is **independent of XSUS AI Core**. It does not import or modify `server.js`, the `feature/xsus-ai-core` branch, or the existing Render `xsus-studio` service.

## Local startup
From repository root (Node 20+):

```sh
PORT=3001 XSUS_APP_ALLOWED_ORIGINS=https://www.xsusstudio.com node services/src/deployment/standalone-server.js
```

`GET /healthz` responds with `deploymentEnabled:false`. `POST /api/deployments/validate` remains fail-closed (503) until trusted Supabase clients, authoritative project ownership queries and trusted artifact storage are injected. No endpoint can execute deployments.

## Proposed *new* Render service (not created)
- Name: `xsus-app-deployment-api`
- Repository: `studioxsus-lgtm/xsus-studio`
- Branch: `main`
- Runtime: Node.js 20+
- Root directory: repository root
- Build command: `npm install`
- Start command: `node services/src/deployment/standalone-server.js`
- Health check: `/healthz`
- Environment: `XSUS_APP_ALLOWED_ORIGINS=https://www.xsusstudio.com` (no provider secrets until backend integration is audited)

Do **not** repoint or redeploy existing `xsus-studio` or `future-xsus-core-api` services. The current API is validation-only and not production-ready for authorization until trusted dependencies and rate limits are configured. Avoid treating a passing health check as deployment authorization.

## Phase 15.5 — dependency isolation and smoke tests
The standalone service now has its own `services/src/deployment/package.json` with **zero declared third-party runtime dependencies**. From that directory run `node --test tests/*.test.js` or `npm test`. This does not mean the existing root dependency audit is resolved: Render currently runs `npm install` at repository root, and the initial deployment reported **2 critical and 1 moderate** npm audit findings. Their package identities and exploitability have not been established.

For a future **isolated** build of this service, use Render root directory `services/src/deployment`, build command `npm install --omit=dev`, start command `npm start`, and health path `/healthz`. Do not apply these settings to existing XSUS AI Core or Future XSUS Core services. This proposed change needs a reviewed redeployment of only `xsus-app-deployment-api`. Its production authorization remains disabled until trusted project and artifact stores are implemented.

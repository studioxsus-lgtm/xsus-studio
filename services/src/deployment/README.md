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

# XSUS App Build Engine — Render server integration

Render workspace confirmed: My Workspace. Existing service: xsus-app-deployment-api, ID srv-dc1j9jetlv9c73c8okp0, branch main, autoDeploy disabled, Node entry services/src/deployment/standalone-server.js.

This commit adds an opt-in Node HTTP adapter for the existing Build Engine HTTP contract. The adapter is **not mounted or deployed**. It requires trusted authenticate, authorizeProject and engine implementations; do not mount until the durable claim, host fencing and isolated runtime are operational. The current Render free Node web service is not verified to have a Docker daemon, privileged staging helper or container isolation. A separate hardened build worker may be required.

The build endpoint must be wired into standalone-server.js with explicit feature gating, request origin policy, per-user rate limiting, JWT validation, owner-scoped database access and operational logging. Do not switch the Render service branch or trigger a deploy before those prerequisites are tested. The existing production deployment API remains unchanged.

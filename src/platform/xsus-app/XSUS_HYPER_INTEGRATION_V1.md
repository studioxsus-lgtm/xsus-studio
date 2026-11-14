# XSUS App ↔ Hyper XSUS Core v8.0 — Controlled Integration

## Implemented on feature/xsus-ai-core

- Server-only `src/platform/xsus-app/xsus-hyper-adapter.js`.
- 12 adapter contract tests under `src/platform/xsus-app/tests/`.
- Optional `GET /api/xsus-app/hyper/assurance` endpoint in `server.js`.
- Browser transport `platform/xsus-app/xsus-hyper-client.js`, requiring a caller-supplied access token.
- Independent Hyper XSUS Core v8.0 remains in its existing directory and is never bundled into the browser.

## Enable only on a secured backend

Set `XSUS_HYPER_APP_ENABLED=true` and configure these server-side environment variables:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `XSUS_HYPER_AUDIT_DIRECTORY`, `XSUS_HYPER_AUDIT_KEY`, `XSUS_HYPER_AUDIT_KEY_ID`
- `XSUS_HYPER_ANCHOR_DIRECTORY`, `XSUS_HYPER_ANCHOR_KEY`, `XSUS_HYPER_ANCHOR_KEY_ID`

The audit and anchor directories must be independent absolute paths.
The existing authenticated Supabase user verifier validates bearer tokens.
The endpoint cannot initialize, advance, repair or delete any checkpoint
or audit artifact. The trusted anchor reviewer is explicitly deny-all.

No configuration or keys are committed. Never put these values in
`app.html`, browser JavaScript, GitHub Pages or public Vite variables.

## Deployment boundaries

GitHub Pages serves static assets only; it cannot run the Node backend.
The endpoint must be deployed separately behind HTTPS and an
appropriate allowed-origin policy. The browser transport uses a
same-origin relative path, so configure a same-origin reverse proxy
before calling it. The transport does not persist access tokens.

The current `app.html` remains unchanged: its existing XSUS App
Bridge is preserved. UI activation requires an authenticated session
source and a deployed backend. Do not claim live connection until
those are configured and end-to-end verified.

## Verification

Run `npm test` on `feature/xsus-ai-core`.
Also verify unauthenticated 401, invalid token 403, disabled endpoint
503, signed healthy report 200, blocked report 200 with
`safeToResume=false`, and unexpected storage error 503.
A successful test suite alone does not establish live deployment.

`main` is unchanged.

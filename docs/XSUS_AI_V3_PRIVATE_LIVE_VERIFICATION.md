# XSUS AI V3 — Private Live Verification (Phase 22.16.5.8.14.28)

## Status
This is a **manual verification runbook**, not proof of a live successful round trip.
No feature flags are enabled by this document. Never paste JWTs, service-role keys,
or other credentials into issues, chats, logs or screenshots.

## Current architecture
- GitHub Pages frontend: `main`, `assets/js/xsus-ai/app.js`
- Backend: `feature/xsus-ai-core`, `server.js`
- Public route: `POST /api/chat` (must remain operational)
- Private route: `POST /api/private-chat` (requires authenticated bearer token)
- Supabase tables: `public.ai_conversations`, `public.ai_messages`
- Private browser flags default to `false`: `enablePrivateWrites` and `enablePrivateReplies`.
- Backend private route and assistant writer each require an explicit separate environment flag.

## Preflight (read-only)
1. Confirm latest frontend and backend GitHub Actions are green independently.
2. Run the existing read-only Supabase readiness SQL; record all six results.
3. Confirm the public /health endpoint responds and public /api/chat works.
4. Confirm private route is not publicly writable without authentication.
5. Review Render environment variable **names and enabled/disabled status only**;
   do not reveal or export secret values.
6. Confirm the deployed backend commit and frontend commit correspond to tested revisions.

## Controlled live verification (requires explicit authorization before activation)
Use only a test account and an approved test environment. Never use real user conversations
for test data. Do not enable production flags based only on simulated unit tests.

1. Sign in as test account A.
2. Create one new private conversation; send a distinctive harmless message.
3. Verify exactly one user row and one assistant row exist in the same conversation,
   and both belong to A. Confirm operation IDs match the idempotency contract.
4. Reload the page. Confirm both messages and the correct conversation are restored.
5. Retry the same operation; verify no duplicate rows are created.
6. Sign out and verify private conversation content is cleared from the UI.
7. Sign in as test account B; verify A's conversation is not visible or writable.
8. Return to A; verify history rehydrates correctly.
9. Confirm public /api/chat still responds when private mode is disabled.
10. Check errors, status codes, and logs for unexpected failures, without logging tokens.

## Stop conditions
- Any cross-account data exposure or unauthorized write
- Missing or duplicated assistant message
- Wrong conversation or operation ID
- Refresh loses persisted messages
- Public chat regression
- Backend cannot independently verify ownership
- Any unexpected credential disclosure

## Evidence
Record for each check: timestamp, environment, tested commit SHA, PASS/FAIL,
and non-sensitive observations. Do not mark `authenticated_user_round_trip`,
`refresh_restores_both_roles`, `second_account_isolation`, or
`retry_no_duplicate_messages` as PASS until observed in the real environment.

## Rollback
Keep private frontend flags disabled by default. If testing reveals a defect,
disable private route and assistant writer feature flags and investigate before
retrying. Do not disable Supabase RLS.

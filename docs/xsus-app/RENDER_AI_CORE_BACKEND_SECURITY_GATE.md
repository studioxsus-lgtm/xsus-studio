# XSUS App → XSUS AI Core: Render backend security gate

Status: **NOT VERIFIED**. The `xsus-studio` repository currently contains the
browser-side adapter `platform/xsus-app/xsus-ai-core-client.js`, but not the
Render `/api/chat` server implementation. Passing browser mock tests does not
establish backend authorization.

## Required server contract (before enabling real XSUS App chat)

1. Require HTTPS and `Authorization: Bearer <Supabase access token>`.
   Reject missing, expired, malformed, revoked, or unverifiable JWTs with 401.
2. Verify the JWT **on the server** using a trusted Supabase Auth verification
   method, not by decoding unverified claims or trusting a client-provided user ID.
3. Verify `conversationId` ownership against the authenticated user on every
   request, using the server's data access boundary. Reject cross-account access
   without revealing the existence or contents of another user's conversation.
4. Ensure the query is only processed for an authorized conversation. Do not
   persist or generate an assistant response for unauthorized requests.
5. Keep Supabase service-role credentials and model/provider secrets exclusively
   on the server; never send them to the browser.
6. Rate-limit authenticated requests; enforce input and output size limits.
7. Return a bounded response matching the adapter's expected `answer` shape.
   Never return private prompts, internal stack traces, access tokens or secrets.
8. Do not allow arbitrary cross-origin redirects; configure CORS explicitly for
   the intended XSUS Studio origin.
9. Handle token rotation, logout and A→B account changes. Client-side checks
   are an additional guard, not a substitute for server authorization.
10. Keep XSUS AI Core and Hyper XSUS Core independently deployed and integrated
    through their own adapters. No cross-core data access by default.

## Minimum live acceptance tests

- Valid A token + A-owned conversation → authorized response.
- No token / invalid token / expired token → 401, no model call, no write.
- Valid A token + B-owned conversation → denied, no model call, no write.
- Valid B token + A-owned conversation → denied, no data disclosure.
- A token + nonexistent conversation → denied without private data disclosure.
- Token/user changed during a browser request → stale reply never displayed.
- Server errors, malformed JSON, and 5xx → no success UI and no secret leakage.
- Audit logs record request IDs and security outcomes without recording JWTs
  or sensitive conversation text.

## Evidence needed to close this gate

- Render service repository/path and deployed commit SHA.
- Server route implementation and authentication/ownership middleware.
- Supabase RLS policy evidence for conversations and messages.
- CI or staging test results for the above A/B authorization cases.
- A verified staging smoke test using test accounts, never production secrets.

**Do not mark the backend verified or enable production chat based solely on
GitHub Pages deployment, adapter tests, or successful mock responses.**

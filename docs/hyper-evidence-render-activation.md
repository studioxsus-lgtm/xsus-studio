# Hyper evidence: Render activation checklist (not yet authorized for production)

## Verified
- User reported 11/11 Supabase structural checks true.
- Live Render endpoint GET returned RUNTIME_DISABLED.
- Supabase table existence and RLS do not prove evidence ownership provisioning.

## Environment names (values must remain secret)
- SUPABASE_URL — already present
- SUPABASE_ANON_KEY — already present
- SUPABASE_SERVICE_ROLE_KEY — already present; never expose to browser
- XSUS_HYPER_EVIDENCE_KEY — NEW: 32 cryptographically random bytes encoded as 64 hexadecimal characters. Generate offline or in a trusted terminal with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store only in Render secret environment. Do not commit, paste into chat, or take screenshots of its value.
- XSUS_HYPER_EVIDENCE_KEY_ID — NEW: nonsecret identifier matching `^[A-Za-z0-9_-]{1,64}$`, e.g. `render-evidence-v1`.
- XSUS_HYPER_EVIDENCE_ROUTE_ENABLED — keep unset or `false`.

## Mandatory prerequisites before enabling
1. Establish trusted server-side owner provisioning when creating each evidence bundle; never accept userId from a browser.
2. Verify storage and owner mapping atomicity/failure recovery and service-role privilege scope.
3. Execute and inspect tests against a safe test environment, including authenticated owner, non-owner, expired token, and missing bundle.
4. Confirm deployment commit and inspect Render logs; ensure CORS is limited to allowed origins.
5. Obtain explicit approval for enabling the route and changing production configuration.

## Notes
- An enabled verification endpoint can only verify already-stored evidence associated with a verified owner. It does not create evidence.
- An empty ownership table means verification returns FORBIDDEN; never insert fabricated mappings to make a test pass.
- The HMAC authenticates evidence provenance with a shared secret; it does not attest the runtime.

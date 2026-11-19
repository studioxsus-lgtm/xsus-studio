# Hyper XSUS Core ↔ Future XSUS Core bridge

The bridge is a server-side, authenticated composition of two separate cores.
It does not merge their runtimes or expose either service credential to a
browser.

## First supported workflow

`POST /api/xsus-app/hyper-future/plan` accepts an English goal and 1–100
explicit plan steps. The Hyper service verifies the Supabase user, forwards
that user's bearer token to Future XSUS Core, and asks Future to proofread the
goal through its stateless `/v1/language/proofread` endpoint. If Future marks
the text for human review, Hyper stops and returns `review_required`. Otherwise
Hyper validates the supplied step identifiers and dependency graph and returns
a draft plan.

The response always declares `executable: false` and `sideEffects: false`.
Hyper's current planning engine validates user-provided steps; it does not
invent steps or run them. Future's first bridge capability supports English
only. The proofread endpoint does not create a session or write text to disk.

## Request

```json
{
  "goal": "Build a safe app plan.",
  "steps": [
    { "id": "inspect", "task": "Inspect requirements", "dependsOn": [] },
    { "id": "review", "task": "Review the proposal", "dependsOn": ["inspect"] }
  ]
}
```

Send `Authorization: Bearer <Supabase user access token>` and
`Content-Type: application/json`. The request is capped by the Hyper HTTP
server body limit; goal/task text is limited to 4,096 characters and a plan
contains at most 100 steps.

## Enablement

The route is closed unless `XSUS_HYPER_FUTURE_BRIDGE_ENABLED=true`. It uses the
existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` values to verify the user, then
forwards only the verified user's access token to the fixed HTTPS Future XSUS
Core origin. It never falls back to XSUS AI Core.

The Future service must deploy the matching `/v1/language/proofread` endpoint
before enabling the Hyper route. Both APIs return `Cache-Control: no-store`.

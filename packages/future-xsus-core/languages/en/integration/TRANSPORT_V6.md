# V6 transport-neutral integration contract

This opt-in Python adapter accepts a bounded-lifetime envelope with exactly
`request`, `issued_at`, and `expires_at`. Both timestamps must be
timezone-aware ISO 8601 values. Maximum declared lifetime: 30 seconds.

Dispatch sequence: feature flag -> envelope validation -> issued/expiry
checks -> upstream-verified principal scope -> per-invocation budget ->
existing V6 diagnostic adapter.

The expiry check is **not an execution timeout**. The adapter does not
interrupt work once started, authenticate credentials, enforce distributed
rate limits, prevent replay, or open a network listener.

Before real XSUS App deployment, implement transport authentication,
authorization, replay protection, external rate limiting, actual processing
timeouts, observability, and rollout/rollback outside this module.

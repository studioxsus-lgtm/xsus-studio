# Phase 28 — Runtime service boundary

This is a server-side runtime **service contract**, not a deployed execution service.

It validates a build manifest, restrictive policy, execution identity, server authorization, artifact digest, isolated executor result and execution proof. It rejects missing or unverified proofs and never authorizes production deployment.

Required before production:
- Implement a separately audited `runIsolated` executor with enforced resource limits, no network, nonprivileged identities, disposable filesystem and robust teardown.
- Implement a trusted cryptographic proof verifier, identity binding and replay protection. Never use a verifier that blindly returns true.
- Implement server-side authorization, credential rotation, request size limits, rate limiting, observability and isolation adversarial tests.
- Add a real authenticated HTTP endpoint only after its security review. No endpoint or infrastructure has been provisioned by this phase.

The injected mocks in tests are contract fixtures and are **not** evidence of actual runtime isolation.

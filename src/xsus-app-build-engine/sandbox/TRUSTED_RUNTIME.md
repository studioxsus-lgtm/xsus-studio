# Phase 25 — Trusted Runtime Adapter

This adapter defines the boundary to a future externally operated sandbox. It does **not** create a container, isolate processes, enforce limits, authenticate a provider, or implement cryptographic verification itself.

Required independent components:
- A sandbox provider that genuinely enforces resource quotas, disabled network, ephemeral filesystem and nonprivileged execution.
- A trusted SHA-256 digest implementation.
- A verifier that checks signed attestation provenance and binds execution ID, project, artifact digest, and exact sandbox policy.
- An audited trust root and replay protection maintained by the verifier/provider.

The adapter fails closed when the verifier rejects the attestation. An injected verifier that returns true without cryptographic checks is **not** evidence of real isolation. The runtime cannot approve production deployment.

Next: integrate a concrete audited provider, verify attestation end-to-end, run negative isolation tests and GitHub CI. Do not set `verifiedIsolation` based solely on a provider response flag.

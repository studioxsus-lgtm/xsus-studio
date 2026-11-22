# Phase 31 — Secure process runner (initial implementation)

Server-side-only process runner for the Docker driver. It requires injected process spawning and independent container cleanup, uses argv without shell interpretation, restricts the child environment, enforces a local timeout and output cap, and calls daemon-side cleanup in a finally block.

**Security limitations:** This is not a hardened host runtime. The caller must provide a trusted Docker daemon connection, audited cleanup implementation and rootless isolation. The process runner must not be imported into frontend code. An injected spawn function must honor the no-shell options. A failed or hanging daemon-side cleanup requires external supervision. The current runner does not stage project files; secure artifact staging and crash recovery remain outstanding. The driver and runtime service still cannot produce trusted isolation attestations.

Next: implement verified artifact staging and independently audit process termination, orphan cleanup and isolation on a dedicated test host.

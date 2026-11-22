# Phase 30 — Docker container driver boundary

This module builds a fixed, restrictive Docker CLI invocation for a digest-pinned runtime image. It **does not run Docker on its own**. The process runner, staging materializer and cleanup functions are injected server-side.

The process runner MUST use argv without a shell, enforce hard timeouts and output limits, forcibly remove containers on timeout/cancellation, reject unsupported daemon contexts and remote sockets, and handle cleanup on crashes. The staging provider MUST create a private, non-symlinked directory under /var/lib/xsus-sandbox/staging, safely materialize only validated files, prevent path traversal and verify ownership/permissions. Cleanup MUST remove staged files even on failure.

The host isolation verifier remains mandatory upstream. A real deployment additionally needs seccomp/AppArmor, rootless Docker or equivalent isolation, daemon access controls, cgroup enforcement, dedicated hosts, adversarial testing and audited attestation. This driver deliberately returns proof:null; a successful exit code never proves isolation.

**Not production ready.** The included tests use injected mocks, not a live Docker daemon.

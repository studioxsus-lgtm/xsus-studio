# Phase 29 — Isolated execution provider contract

The executor constructs a restrictive container specification: digest-pinned image, disabled network, read-only root filesystem, unprivileged UID/GID, no new privileges, dropped capabilities, PID/memory/CPU/time/output limits, and a constrained temporary filesystem.

**Not yet a real sandbox:** the container driver and host isolation verifier are injected and not implemented here. No container is started by this module unless a real driver is supplied. A driver must enforce every specification field, verify rootless/cgroups/seccomp/network namespaces, reject unsafe host mounts, terminate processes on timeout/cancellation and clean up reliably. A trusted independent attestation verifier must authenticate execution evidence and prevent replay.

Tests use fake drivers and must not be described as proof of isolation. Before production, run negative tests against a real isolated host and audit the runtime, image supply chain, and infrastructure configuration.

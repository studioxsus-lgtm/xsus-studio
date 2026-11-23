# Phase 66 — Build security preflight

Adds a backend-only build-security gate before invoking the trusted isolated runtime. It enforces the existing sandbox policy limits, rejects selected sensitive artifact names and executable extensions, and caps aggregate UTF-8 source bytes at 2 MiB. It composes with Phase 65 structural verification without modifying existing contracts.

**Limitations:** Filename checks are defense-in-depth, not malware detection, secrets scanning, or sandbox isolation. Static HTML/JS remains untrusted and must only run in a hardened runtime. Real Docker host isolation, staging UID permissions, seccomp, continuous cancellation, credential boundaries, and production authorization remain unverified. Tests are mocked and must be confirmed by CI.

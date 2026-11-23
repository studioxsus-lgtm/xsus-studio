# Phase 63 — XSUS App Build Bridge

An opt-in, server-side composition boundary for the XSUS App project generator and the Phase 62 isolated runtime. The caller must authorize the user/project/operation, generate project files, validate the build manifest, run the isolated executor, and persist a minimal result receipt. The bridge does not expose generated source in its response.

**Not live:** The actual XSUS App UI and production backend are not connected here. `generateProject`, `authorize`, `runtime`, and `recordResult` are trusted injected contracts. A successful runtime response is not cryptographic proof of execution; host verification and signed receipts remain necessary. The bridge must run on the backend, never in the browser. Real Docker/PostgreSQL tests and deployment authorization are still outstanding. Tests are mocked.

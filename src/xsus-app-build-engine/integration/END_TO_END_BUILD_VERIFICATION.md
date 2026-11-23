# Phase 65 — End-to-end build verification

A verified project-build composition adds a static manifest preflight between the existing Phase 64 generator and the trusted runtime. It verifies an HTML entry, main landmark, and expected CSS/JS references. Integration tests exercise the entire application-level chain: authorize -> plan -> generate -> validate -> preflight -> injected runtime -> record result. Negative tests cover invalid architecture, unauthorized requests, cancellation, failed builds and uncertain runtime errors.

**Scope:** The runtime is mocked; this is not a real Docker build or browser execution. The preflight is structural, not a security scanner or HTML parser. CI must confirm tests independently. The app frontend, database, and real sandbox are not yet wired together.

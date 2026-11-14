# Hyper XSUS Core v7.0 — Coordinated Recovery Security Architecture

Introduces `createRecoverySecurityArchitecture({inspectHealth})`.
It composes the existing v6.5 operational verification and v6.8 strict
security validation. Each verifier takes two independent observations.
The coordinator requires both to report ready, stable and identical
authenticated anchor/audit marks; otherwise it fails closed with
`RECOVERY_SECURITY_CROSS_CHECK_FAILED`.

The incident recovery facade optionally exposes
`assessTrustedRecoverySecurityArchitecture()` when the trusted audit
anchor is configured. All existing methods and version constants remain
unchanged.

Thirteen tests cover authenticated readiness, signed advancement,
changes within and between observation windows, malformed reports,
explicit blockers, integrity exceptions, I/O errors, pending evidence,
signed rollback, immutable results and input validation.

This is an advisory read-only assessment, **not** an atomic snapshot,
authorization, lease, repair mechanism or externally anchored rollback
guarantee. Run `npm test` on `feature/xsus-ai-core`; do not mark v7.0
verified until CI passes. `main` remains untouched.

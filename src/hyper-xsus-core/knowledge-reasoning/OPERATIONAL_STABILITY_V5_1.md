# Hyper XSUS Core v5.1 — Operational Snapshot Stability

Strengthens the existing read-only v5.0 operational report without
changing its version, public method, response shape, or authorization
semantics.

After the second readiness assessment, the reporter reads the
authenticated checkpoint and archive again. It rejects differences
in checkpoint count/tip, archive count/tip, or archive entry
sequence/signatures with `XSUS_RECOVERY_OPERATIONAL_CHANGED`.
Underlying storage errors propagate unchanged.

Six new deterministic tests exercise checkpoint mutation, archive
append, changed entry signatures, stable snapshots, blocked readiness,
and storage I/O failure.

This is a strengthened point-in-time consistency check, **not**
a globally atomic snapshot. Concurrent mutations may still occur
after the final read; callers must not use the report as a permission
to resume or as a replacement for the mandatory promotion guard.
No automatic recovery, lock removal or state repair is performed.

Run `npm test` to verify this change. Branch:
`feature/xsus-ai-core` (not `main`).

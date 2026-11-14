# Hyper XSUS Core v4.9 — Crash Consistency & Recovery Verification

Adds eight deterministic fault-state regression tests in
`tests/recovery-crash-consistency-v49.test.js`.

Scenarios: incomplete checkpoint.pending, simultaneous pending and lock
residue, truncated checkpoint.json, truncated signed archive evidence,
corrupt unanchored archive tail after a confirmed checkpoint,
tampered checkpoint with pending replacement, retention of an existing
pending artifact, and orphaned archive writer lock.

All scenarios must fail closed where applicable. No automatic removal,
checkpoint rollback, key rotation, evidence repair or trusted-state
rewriting is introduced. Existing public APIs and error contracts
remain unchanged.

**Scope:** these tests inject persisted filesystem artifacts to model
interrupted write states. They do **not** kill a process at exact
write/fsync/rename boundaries, simulate a power failure, or establish
cross-filesystem durability guarantees. The v4.8 subprocess tests
cover a separate SIGKILL-during-review scenario. A full CI run is
required to verify v4.9.

Development branch: `feature/xsus-ai-core`; `main` unchanged.

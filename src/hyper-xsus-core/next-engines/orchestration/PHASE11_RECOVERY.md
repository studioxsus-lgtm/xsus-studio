# Hyper XSUS Core — Phase 11 recovery and fault boundaries

This module persists a **review-only decision journal** for the six-engine orchestrator. It does not execute tasks, recover execution, or authorize agents.

## Commit boundary

1. Validate the response and derive a minimal decision journal.
2. Acquire an exclusive local file lock and read/validate the existing snapshot.
3. Reject a different request or conflicting content.
4. Serialize a versioned envelope with SHA-256 checksum.
5. Write to a unique temporary file, sync it, rename over the target, and sync the parent directory (where supported).
6. Release the lock.

## Recovery rules

- Missing journal: return `null`, never infer success.
- Invalid JSON, checksum mismatch, or invalid checkpoint: fail closed. Do not overwrite the corrupted file automatically.
- Conflicting request ID or content: reject without changing committed bytes.
- Failed write before rename: the previous committed journal is unchanged; temporary file is cleaned up best-effort.
- Failure after rename or during directory sync: the caller **must not assume failure means no commit**. Reopen and inspect the journal before retrying.
- A stale lock after forced process termination is **not automatically stolen**. Investigate the owner and filesystem before manual recovery.
- SHA-256 is an accidental-corruption check, **not** a signature or protection against a malicious writer who can recompute the digest.

## Test coverage

Phase 11 injects failures at the atomic writer boundary, verifies cleanup, retry after a failed write, lock release, conflict preservation, and corruption detection.

**Not yet covered:** deterministic SIGKILL precisely between file sync and rename; power-loss guarantees; NFS/distributed locking; external authorization; authenticated integrity; multi-record transaction commits. Do not claim production readiness from these tests.

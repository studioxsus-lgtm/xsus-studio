# Hyper XSUS Core v4.0 — Durable Incident Checkpoint Backend

New `durable-incident-checkpoint.js` provides
`createDurableIncidentCheckpoint({directory,key,keyId})` with:
- `initialize()` — creates an authenticated genesis checkpoint once;
- `read()` — authenticates the HMAC-SHA256 signed checkpoint;
- `advance(previous,next)` — exclusive single-host writer lock,
  compare-and-swap, monotonic count, temporary-file fsync,
  atomic rename, directory fsync and post-write verification.

The backend is compatible with the `checkpoint.read()` and
`checkpoint.advance(previous,next)` contract required by the
v3.9 reviewer-authorized promotion coordinator.

A new 18-case test suite exercises initialization, restart,
signature tampering, stale CAS, orphaned locks, invalid transitions
and 25 sequential durable advances.

Security boundaries: this is **single-host local durability**, not
a separately trusted external high-water anchor. A privileged
filesystem attacker with the key can rewrite or roll back both state
and local evidence. Protect the checkpoint directory and key
independently from the incident archive. It does not implement
multi-host consensus, remote attestation, automatic lock recovery
or automatic checkpoint promotion. Crash residue such as
`checkpoint.pending` or `checkpoint.lock` must be investigated
before retrying; do not delete them automatically.

Branch: `feature/xsus-ai-core`. No changes to `main`.
Run `npm test` and inspect results before confirming v4.0.

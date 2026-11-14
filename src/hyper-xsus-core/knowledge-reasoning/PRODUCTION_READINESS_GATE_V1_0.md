# Hyper XSUS Core — Production Readiness Gate v1.0.0 (candidate)

## Changes
Persistent audit appends now acquire an exclusive sidecar lock using Node
`open(path + ".lock", "wx")`. After acquiring it, the writer reloads and
validates the committed journal before computing the next sequence and hash.
This prevents stale in-memory snapshots from silently overwriting another
writer's committed receipt when all writers cooperate with this protocol.

## Crash and operations policy
A SIGKILL can leave a sidecar lock behind. The writer **does not** steal or
remove an existing lock automatically. A recovery operator must first verify
that no process still owns the lock, inspect and validate the committed
journal, then remove only the known orphan sidecar lock before retrying.
This is deliberately availability-limiting and fail-closed.

The sidecar lock is not a security boundary against malicious filesystem
actors; there is no cross-host coordination or distributed lease. A single
shared local filesystem with reliable exclusive-create semantics is required.
No external signing/anchoring is implemented. Hashes are not signatures.

## Acceptance checklist
- [ ] Full test suite passes after v1.0.0 changes.
- [ ] SIGKILL tests pass with explicit orphan-lock handling.
- [ ] Concurrent independent process tests pass on deployment filesystem.
- [ ] Document backup, restore, retention and lock recovery runbooks.
- [ ] Threat model for filesystem tampering and external trust anchor.
- [ ] Deployment-specific permissions and monitoring review.
- [ ] Validate all production runtime adapters and authorization wiring.

Do not declare production-ready until all gates are independently verified.

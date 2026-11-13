# Hyper XSUS Core — Transaction Journal Reliability Milestone v4.0.0

Status: implementation committed; GitHub Actions results must be checked before declaring the milestone verified.

## Scope and verified-by-test behavior

- Atomic JSON snapshot writing uses a temporary file, file sync, rename, and directory sync.
- Journal validation rejects invalid transaction IDs, states, counters, and duplicate IDs.
- With `exclusiveLock: true`, a lock coordinates cooperating processes on one local filesystem; lock contention fails closed with `XSUS_FILE_LOCK_BUSY`.
- `saveIfRevision` uses SHA-256 of exact committed file bytes and rejects stale revisions with `XSUS_JOURNAL_REVISION_CONFLICT`.
- `recoverInterrupted` changes `running` to `interrupted` and preserves completed/failed entries; repeated recovery without changes does not rewrite the snapshot.
- Crash, concurrency, corruption, and stress scenarios are covered by dedicated v3.x tests; the v4.0.0 milestone adds a combined integration regression suite.

## Explicit limitations

- This is a **local-filesystem transaction journal**, not a distributed transaction manager, database, or complete Knowledge Graph persistence engine.
- A SHA-256 revision is an optimistic concurrency token, **not** a cryptographic authenticity guarantee or a backup.
- Atomic rename and fsync tests do **not** establish durability across real power loss, filesystem corruption, remote/network filesystems, or hardware faults.
- A killed process may leave a lock file behind. Automatic stale-lock stealing is intentionally disabled; recovery requires a separate safe operational procedure.
- A crash before rename may leave temporary files. Assessment is read-only; automatic deletion is not authorized.
- Invalid committed bytes fail closed. Restoration from a trusted backup is an explicit external operation.
- Cooperative locking does not protect against arbitrary non-cooperating writers or external file modifications.
- There is no cross-file atomic transaction guarantee.

## Acceptance gate

1. All existing Knowledge Graph and Hyper XSUS Core tests pass in GitHub Actions.
2. `transaction-journal.reliability-milestone-v40.test.js` passes.
3. No existing public API contract changes; `main` remains unchanged.
4. Operational and power-loss limitations remain documented.

Do not mark the entire Knowledge Graph module complete based on this milestone alone.

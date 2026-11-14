# Hyper XSUS Core v3.7 — Independent Checkpoint Crash Guard

New `incident-crash-guard.js` adds read-only inspection of the v3.6
authenticated incident archive against a separately trusted checkpoint.

API: `createIncidentCrashGuard({directory,archive,checkpoint})`
where `checkpoint.read()` supplies `{count,tip}` from an independently
protected source. `inspect()` checks the writer lock, unexpected incident
artifacts, the authenticated archive, and stability of both checkpoint
and archive across two reads.

It blocks resumption when there is an orphaned writer lock, an archive
rollback/fork or an unanchored archive tail. It does not remove locks,
advance checkpoints, rewrite files, or invent missing evidence.

The new 18-test suite includes 30 signed append operations, restart
verification, truncated archives, changed checkpoints, malformed state,
writer locks, and archive corruption.

Important: the checkpoint must be independently trusted and durable.
This module does not itself provision an external checkpoint, nor can it
guarantee a race-free snapshot against a malicious concurrent writer.
The previous signed archive's append protocol is unchanged.
Run `npm test` and inspect CI output before marking v3.7 verified.
All work remains on `feature/xsus-ai-core`, not `main`.

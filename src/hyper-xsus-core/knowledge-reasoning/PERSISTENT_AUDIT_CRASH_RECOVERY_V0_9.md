# Hyper XSUS Core — Crash Recovery & Fault Tolerance v0.9.0

## Scope
This phase adds real child-process SIGKILL tests at two deterministic
write boundaries of the existing v0.8.0 persistent decision audit:
(1) before atomic rename and (2) after rename, before directory fsync.
It also adds fault injection for rename and directory-sync errors,
journal chain tampering, unexpected personal fields and broken continuity.

## Invariants
- The committed journal is never replaced by an incomplete temp file.
- Only the committed journal path is loaded; orphan temp files are ignored.
- Each recovered receipt is validated against its SHA-256 chain.
- Failed writes close the affected instance to further appends.
- No raw query, principal, or evidence content is persisted.
- The tests do not prove crash durability against power loss or storage faults.
- The audit journal is not authenticated against an attacker who can rewrite
  the entire file and recompute hashes; an external trust anchor is needed.

## Test
Run `npm test` in the feature branch. Two new SIGKILL tests require a
POSIX environment; they are skipped on Windows. Five additional fault tests
are portable except for their filesystem-path assumptions on Windows.
Do not mark this phase verified until CI or a local full suite passes.

## Future hardening
Durable external audit anchors, explicit backup/restore policies,
cross-process write locking and crash tests on actual target storage.

# Hyper XSUS Core v4.3 — Real Process Crash Tests

Adds `tests/helpers/incident-crash-child-v43.mjs` and
`tests/incident-crash-recovery-v43.test.js` (7 test cases).

The test parent launches a real Node.js child process. The child
creates either the archive writer lock or the durable checkpoint
writer lock, signals `LOCK_READY`, and is terminated with the
operating system's `SIGKILL`. The parent waits for process exit
before reopening the recovery integration from a new instance.

Checks include archive promotion refusal, checkpoint CAS refusal,
preservation of previously anchored checkpoint, preservation of
signed archive evidence, persistence of stale locks across
process restarts, and signed checkpoint tampering.

**Scope limitation:** the child is killed while holding a
real lock, not at an instrumented write, fsync, rename or
directory-sync boundary. Therefore these tests demonstrate
process-death lock-residue handling, but do not establish full
crash consistency for every storage instruction. The harness
requires an operating system with SIGKILL support (Linux CI).
Never automatically remove stale locks: operator review remains
mandatory. The local checkpoint is not an external trust anchor.

Branch `feature/xsus-ai-core` only; `main` untouched.
Run `npm test` to validate before claiming success.

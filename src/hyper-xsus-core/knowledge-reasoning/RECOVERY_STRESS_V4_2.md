# Hyper XSUS Core v4.2 — Recovery Stress & Fault Injection

Adds `tests/incident-recovery-stress-v42.test.js` (13 test cases)
for the existing v4.1 integrated incident recovery API.

The primary load scenario performs 40 authenticated incident appends,
one explicitly reviewed checkpoint promotion, and 960 repeated durable
checkpoint reads with periodic signed archive inspections, for more
than 1,000 authenticated operations. Other tests cover 10 separate
restart/review cycles, 12 concurrent append contenders, orphaned
archive and checkpoint locks, a pending write artifact, tampered
archive signatures, archive truncation, missing middle evidence,
checkpoint tampering, reviewer denial, and uninitialized checkpoints.

This is deterministic fault injection, **not** a real SIGKILL process
test. The tests verify single-host behavior only. A signed checkpoint
on the same host is not an external rollback-resistant anchor.
No automatic lock cleanup or evidence repair is attempted.

All changes are on `feature/xsus-ai-core`; `main` remains unchanged.
Run `npm test` in CI before marking v4.2 verified.

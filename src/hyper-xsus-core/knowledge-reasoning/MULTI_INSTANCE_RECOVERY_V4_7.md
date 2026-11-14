# Hyper XSUS Core v4.7 — Multi-Instance Recovery Concurrency

Adds six integration tests in `tests/multi-instance-recovery-v47.test.js`.

Tests use independently constructed integration instances sharing the
same on-disk archive and checkpoint directories. They cover:

1. Competing promotions of one signed tail: only one succeeds.
2. One paused reviewer while another instance promotes the tail.
3. Concurrent append attempts without losing authenticated evidence.
4. Shared pending checkpoint residue blocking both instances.
5. Shared orphaned checkpoint lock blocking both instances.
6. Three independently created readers agreeing after five promotions.

The existing recovery implementation, filesystem lock policy,
authorization contract and error codes are preserved.

These are same-host, same-process asynchronous integration tests.
They are **not** distributed consensus, cross-host locking,
power-loss testing or independent OS process stress tests.
A successful CI run is required before claiming v4.7 verification.

Branch: `feature/xsus-ai-core`. Public website branch
`main` remains unchanged.

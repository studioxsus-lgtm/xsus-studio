# Hyper XSUS Core v2.7.0 — Audit fault tolerance

Five filesystem-backed integration regressions:

1. A truncated newest checkpoint fails verification after reopening the store;
   reviewer authorization and trusted high-water advancement do not run.
2. An injected checkpoint fsync EIO aborts the fenced coordinator before
   high-water CAS. The partially written file is intentionally retained
   for forensic analysis, not automatically deleted or trusted.
3. A durable but uncommitted checkpoint is detected after reconstructing
   store/coordinator instances; explicit signed-anchor verification and
   reviewer-approved reconciliation restore verified state.
4. A stale snapshot is rejected during pending reconciliation.
5. Two sequential pending checkpoints each require a separate approval.

Scope: these are controlled filesystem failures and restart simulations.
The trusted high-water and lease backend is an in-memory test fixture.
The suite does not prove actual host crash durability, network partition
safety, remote CAS correctness, or production readiness. Existing v2.2
SIGKILL tests cover separate process boundaries.

Run `npm test` on `feature/xsus-ai-core` before treating v2.7 as verified.

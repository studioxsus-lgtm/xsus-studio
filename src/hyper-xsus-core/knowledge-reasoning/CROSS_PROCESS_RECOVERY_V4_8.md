# Hyper XSUS Core v4.8 — Cross-Process Recovery Reliability

Adds a real Node.js subprocess helper and six Vitest integration tests.
Unlike v4.7, the competing clients here are **separate OS processes**
sharing one local filesystem archive and checkpoint.

Scenarios:
1. Two independent processes race to promote one signed tail;
   exactly one succeeds.
2. Four independent processes compete to append signed evidence,
   preserving gap-free verified sequence for successful writes.
3. SIGKILL while a child is waiting inside reviewer authorization;
   checkpoint remains unchanged and a fresh authorized process can promote.
4. An orphaned checkpoint lock blocks a separate process.
5. A pending checkpoint file blocks a separate process with the
   established `EEXIST` error contract.
6. A new process reads an authenticated checkpoint and consistent
   recovery readiness after successful promotion.

The harness has explicit subprocess exit validation and 12-second
timeouts. No production APIs or storage formats are changed.

**Limits:** SIGKILL occurs during the reviewer callback, **not**
at an instrumented filesystem write/fsync/rename boundary. The
tests do not prove crash consistency under power loss, networked
filesystems, cross-host concurrency or distributed consensus.
Run `npm test` in CI before declaring this version verified.

Branch: `feature/xsus-ai-core`. `main` unchanged.

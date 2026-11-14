# Hyper XSUS Core v2.5.0 — Reliability fault injection

The new Vitest suite `tests/distributed-reliability-v25.test.js`
contains five deterministic integration scenarios:

1. 1,000 consecutive fenced commits with exact monotonic high-water checks.
2. 100 simulated lease expirations after checkpoint rotation, each
   followed by explicit reviewer-authorized reconciliation.
3. 100 denied recovery requests without high-water advancement.
4. Detection of an anchor rollback after 200 committed operations.
5. Concurrent duplicate commit attempts without double counting.

This harness deliberately uses an **in-memory simulated backend**.
It validates integration behavior and fail-closed invariants, not
actual distributed consensus, remote durability, lease fencing across
machines, or SIGKILL behavior. Those require dedicated integration
environments. In particular, test reviewer approval is a fixture,
not a production authorization mechanism.

Run `npm test` on `feature/xsus-ai-core` and inspect CI results.
Do not mark the phase verified before the tests actually pass.

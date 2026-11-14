# Hyper XSUS Core v4.6 — Recovery Transaction Integrity

Adds ten integration regression scenarios in
`tests/recovery-transaction-integrity-v46.test.js`.

Coverage:
1. Archive append during reviewer callback rejects stale assessment.
2. Competing promotion during review prevents duplicate advancement.
3. Same-instance concurrent promotion rejects with BUSY.
4. Stale compare-and-swap snapshot rejects with CAS_CONFLICT.
5. Checkpoint lock blocks CAS without mutation.
6. Pending checkpoint write blocks promotion before reviewer.
7. Signed archive tampering during review is detected.
8. Archive record removal during review prevents promotion.
9. Checkpoint signature corruption during review is detected.
10. Eight sequential reviewed promotions preserve monotonic checkpoint counts.

This phase extends regression verification against the existing
v4.5 recovery integration. No production APIs, storage formats,
trusted keys, automatic recovery policies or repository main
branch are modified.

**Limits:** reviewer-time interference is deterministic fault
injection within a Node.js process, not simultaneous independent
machine failures or power-loss simulation. CAS remains a
single-host filesystem primitive, not a distributed consensus
protocol. Run the full CI suite before treating v4.6 as verified.

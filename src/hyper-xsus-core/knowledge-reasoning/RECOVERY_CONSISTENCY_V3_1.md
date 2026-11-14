# Hyper XSUS Core v3.1.0 — Recovery Consistency Gate

The new `createRecoveryConsistencyGate({highWater,receipts,expected})`
checks the independently trusted expected recovery sequence inventory
against signed persistent receipts and the current journal snapshot.

It fails closed on missing, deleted, unexpected or forged receipts,
duplicate/invalid inventory, high-water inconsistencies and changing
trusted state. Eight tests use actual signed receipt files, including
simulated crash-gap and deletion scenarios.

**Trust model:** `expected.read()` MUST return an independently durable,
authenticated and complete list of recovery sequences, sorted ascending.
The current tests use an in-memory fixture, not a production inventory
provider. This component cannot infer missing recovery events without
such a provider. A process restart is simulated by reconstructing the
gate; SIGKILL subprocess testing and a real distributed backend are
not included in this change.

This is an additive gate. Existing v3.0 lifecycle APIs remain unchanged;
integration and atomic inventory publication are still open work.

Run `npm test` on `feature/xsus-ai-core` to validate.

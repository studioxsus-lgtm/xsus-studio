# Hyper XSUS Core — Integrated Recovery Runtime Bundle v3.2.0

This delivery composes existing signed anchor rotation, fenced coordinator,
reviewer-authorized reconciler, persistent signed receipts, recovery
consistency gate and integrated lifecycle in one public factory:

`createAuditRecoveryRuntime({anchorDirectory,receiptDirectory,key,keyId,highWater,lease,authorize,expected})`

Methods: `inspect(snapshot)`, `recover(snapshot)`. The existing component
contracts and persisted anchor/receipt formats are unchanged.

## Recovery flow
1. Check independently trusted recovery inventory and existing receipts.
2. Verify the signed pending checkpoint and obtain independent reviewer approval
   through the existing reconciler.
3. Commit via trusted high-water CAS with fencing (backend responsibility).
4. Persist and verify a signed recovery receipt.
5. Recheck the independent inventory and fail closed if it does not match.

A successful CAS followed by missing/failed receipt or inventory publication
cannot be rolled back by this runtime. It reports an incomplete or
post-commit-unverified state for incident handling.

## Tests
Five filesystem-backed integration tests cover a full authorized recovery
with a reconstructed runtime, denial, post-commit inventory publication
failure, deletion of committed receipt, and replay rejection.

## Production boundaries
The tests use an in-process CAS/fencing fixture; **no real distributed
backend is implemented**. The external inventory must be independently
authenticated, durable and updated by the trusted backend. The runtime
does not implement atomic publication of high-water, inventory and receipt,
nor solve the crash gap between those steps. A real SIGKILL subprocess
test, cross-host fencing and production backend remain required.

Run `npm test` on `feature/xsus-ai-core`. Do not merge to main until
full integration and operational requirements are verified.

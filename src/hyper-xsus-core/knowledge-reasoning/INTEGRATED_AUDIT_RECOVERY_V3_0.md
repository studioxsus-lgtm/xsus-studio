# Hyper XSUS Core v3.0.0 — Integrated Audit Recovery Lifecycle

The `createIntegratedAuditRecovery({anchors,highWater,coordinator,reconciler,receipts})`
orchestrator exposes `inspect(snapshot)` and `recover(snapshot)`.

- Inspect delegates checkpoint verification to the fenced coordinator,
  compares trusted high-water, and checks signed recovery receipts.
- Recover checks previously stored evidence, delegates signed-anchor
  verification, external reviewer authorization and fenced CAS to the
  existing reconciler, then writes and verifies the receipt.
- A failed receipt write **after** CAS is reported as
  `XSUS_RECOVERY_EVIDENCE_INCOMPLETE`. It is NOT rolled back or retried.
- In-process overlapping lifecycle calls are rejected.
- Six unit tests cover successful flow, denial, corrupted evidence,
  failed evidence persistence, absent tip hash and overlap.

**Important limitations:** The underlying reconciler and trusted backend
remain separate dependencies. No real distributed lease/high-water backend
is implemented here. Receipt persistence is not atomic with CAS; a crash
between them may leave a committed recovery with no receipt. Manual
incident handling is required. Receipt deletion requires an independent
inventory to detect. This orchestrator does not automatically repair
missing receipts or promote pending anchors.

Run `npm test` on `feature/xsus-ai-core`. Do not change `main`.

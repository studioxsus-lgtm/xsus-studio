# Hyper XSUS Core v5.6 — Recovery Audit & Traceability

A bounded, process-local audit of **verified** recovery decision reports.
Each successful `record()` stores a frozen entry with a monotonically
increasing sequence, SHA-256 hash, previous hash, authenticated archive
and checkpoint references, advisory recommendations, and a `changed`
indicator compared with the previous entry.

APIs:
- `createRecoveryDecisionAudit({verifyRecoveryDecisions,maxEntries}).record()`
- `.history()` and `.verify()`
- Integration facade: `recordRecoveryDecisionAudit()`,
  `listRecoveryDecisionAudit()`, `verifyRecoveryDecisionAudit()`

Concurrent calls are serialized. Failures do not append entries.
At capacity the audit refuses new records with
`XSUS_RECOVERY_AUDIT_FULL` instead of discarding history.

**Security boundary:** This is a process-memory journal, not durable
storage or an authenticated tamper-proof audit trail. SHA-256 chaining
detects accidental mutation within the process, but an attacker with
write access to memory can rewrite the chain. A process restart loses
history. No automatic recovery, approval, repair, or checkpoint
promotion is performed. The underlying promotion gate remains
authoritative. A separate phase is needed for durable, authenticated
storage and crash recovery.

Twelve regression tests cover stable/changed snapshots, immutable
history, capacity, concurrency, failures and real integration.
Run `npm test` to verify. Only `feature/xsus-ai-core` changed.

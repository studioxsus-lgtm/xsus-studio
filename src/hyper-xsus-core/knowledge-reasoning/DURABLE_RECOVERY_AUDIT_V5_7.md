# Hyper XSUS Core v5.7 — Durable Recovery Audit Persistence

Introduces opt-in authenticated single-host persistence for verified
recovery decisions. Each snapshot is HMAC-SHA256 authenticated using
a separate 32+ byte key and keyId. Entries form a keyed hash chain.
Writes use exclusive writer directory locks, exclusive pending-file
creation, fsync, atomic rename and directory fsync. Pending artifacts
and stale locks fail closed for manual review; they are never cleaned
automatically. Capacity exhaustion preserves existing evidence.

Standalone API:
`createDurableRecoveryAudit({directory,key,keyId,maxEntries})`
with `.initialize()`, `.read()`, `.append(payload)`.

Optional integration config:
`createIncidentRecoveryIntegration({...existingOptions,durableAudit:{directory,key,keyId}})`.
New facade methods:
`initializeDurableRecoveryAudit()`,
`recordDurableRecoveryAudit()`,
`readDurableRecoveryAudit()`.
The record method obtains a freshly verified v5.5 advisory decision
before persisting it. Existing v5.6 in-memory methods remain unchanged.

Security limits: This is **single-host**, not a distributed
transaction, and it does not protect against rollback of an entire
valid signed snapshot without an external monotonic trusted anchor.
An attacker with the HMAC key can forge entries. A crash may leave a
pending artifact or writer lock requiring explicit manual recovery.
An append is not an authorization to promote or repair.

Eleven new tests cover restart persistence, corruption, key mismatch,
capacity, concurrency, lock/pending residues and facade integration.
Run `npm test` in GitHub Actions. Branch `feature/xsus-ai-core`;
`main` unchanged.

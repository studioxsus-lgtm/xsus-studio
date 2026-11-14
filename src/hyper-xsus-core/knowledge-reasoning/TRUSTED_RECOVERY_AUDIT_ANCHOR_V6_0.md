# Hyper XSUS Core v6.0 — Trusted Recovery Audit Anchor

Introduces `createTrustedRecoveryAuditAnchor({directory,key,keyId,auditDirectory,readDurableAudit,authorize})`.
The anchor reuses the independently signed durable checkpoint storage
with its own absolute directory and 32+ byte signing key. The anchor
must be deployed separately from the audit storage and protected
independently.

Methods: `initialize()`, `read()`, `assess()`, `advance()`.
Advancement is **never automatic**: it requires an authenticated v5.7
audit, a v5.8 integrity check against the prior trusted anchor,
strictly increasing count, explicit reviewer approval, a repeated
audit integrity assessment and checkpoint CAS under an exclusive lock.
No cleanup, repair or incident promotion occurs.

Optional facade config: `trustedAuditAnchor:{directory,key,keyId,authorize}`
alongside `durableAudit`. Facade methods:
`initializeTrustedAuditAnchor()`, `readTrustedAuditAnchor()`,
`inspectTrustedAuditAnchor()`, `advanceTrustedAuditAnchor()`.

**Security limitations:** Separate local files are not automatically
an external trusted authority. A privileged attacker able to replace
both audit and anchor files (or steal signing keys) can still roll
back the state. An independently secured, monotonic external anchor
is required for stronger guarantees. The two audit inspections are
not an atomic lease; the audit can change immediately after the final
inspection. The anchor advancement is monotonic under the checkpoint
adapter's single-host locking model only. Crashes may leave residue
that requires manual intervention.

Ten new tests cover approval, rejection, persistence, rollback
detection, separate directories and pending artifacts.
Run `npm test` in GitHub Actions; only
`feature/xsus-ai-core` was changed, not `main`.

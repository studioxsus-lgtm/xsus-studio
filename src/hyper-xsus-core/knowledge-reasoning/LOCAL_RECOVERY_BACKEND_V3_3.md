# Hyper XSUS Core v3.3.0 — Local Durable Recovery Backend

This package adds `createLocalRecoveryBackend({directory,key,keyId})`
with `initialize(initial)`, `highWater.read/advance`,
`expected.read` and `lease.acquire/release`.

It persists authenticated high-water and the recovery sequence inventory
together in one signed state file. Updates use exclusive temporary file
creation, file fsync, atomic rename and directory fsync. A filesystem
directory lock rejects competing processes on a single host. The lock
is never automatically stolen or expired: a crash may require manual
operator recovery after forensic inspection.

Five integration tests cover persistence across new instances, lock
contention, stale fencing/CAS, tampering and a full signed recovery
using the existing runtime.

**Not production distributed consensus.** This adapter assumes one
trusted host and a local filesystem with reliable atomic rename,
exclusive mkdir and fsync. It does not support multi-host coordination,
network filesystems, automatic stale lock recovery, or hostile root
administrators. State rollback/deletion is not independently detectable
without an external high-water reference. A crash after rename but
before directory fsync may leave uncertain durability. A crash after
trusted CAS but before writing a signed receipt still needs manual
reconciliation of evidence.

Run `npm test` on `feature/xsus-ai-core`. Keep `main` unchanged.

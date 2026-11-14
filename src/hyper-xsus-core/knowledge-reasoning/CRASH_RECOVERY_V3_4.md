# Hyper XSUS Core v3.4.0 — Real Process Crash Assessment

Added `createCrashRecoveryAssessor({directory,highWater,expected,receipts})`
for **read-only** post-crash diagnostics. It reports lock presence,
trusted mark, missing/unexpected recovery receipts, and whether an
operator must review a stale lock. It deliberately returns
`integrityVerified:false`; only the full signed recovery runtime can
authenticate the journal and receipt contents.

Three tests include two actual Node child processes terminated by
`SIGKILL`:
- process killed while holding the exclusive lock;
- process killed after durable CAS/inventory commit but before receipt;
- receipt gap detected with no lock.

The tests do **not** prove that a crash during fsync or rename is safe.
They do not implement stale-lock takeover or automatic receipt repair.
An operator must investigate the stale lock and consult independent
evidence before any manual intervention. The local backend remains
single-host only; multi-host consensus is not implemented.

Run `npm test` on `feature/xsus-ai-core` and inspect CI logs.

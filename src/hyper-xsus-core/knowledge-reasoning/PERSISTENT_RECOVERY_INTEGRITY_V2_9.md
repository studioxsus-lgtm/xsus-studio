# Hyper XSUS Core v2.9.0 — Persistent Recovery Integrity

`persistent-recovery-receipts.js` stores immutable HMAC-SHA256
recovery evidence in individual files with exclusive creation,
file fsync and directory fsync. It exposes `record`, `read`,
`list` and `verifyAgainst`.

Each receipt binds previous high-water, new sequence, journal tip hash
and key ID. Verification checks signatures, trusted high-water bounds,
journal rollback/fork and retention observability. Nine tests exercise
restart-style reopening, tampering, wrong keys, duplicate writes,
forks, rollback, malformed filenames and missing retention.

**Trust boundaries:** A receipt is evidence, not a trusted high-water
mark, lease, approval or automatic recovery. Call `record` only after
a separately verified, reviewer-authorized CAS commit; the module
does not independently enforce that ordering. A lost receipt is not
detectable without an independent inventory/high-water reference.
A privileged filesystem attacker may delete or replace files.
A real external trusted backend and full crash testing remain open.

Run `npm test` on `feature/xsus-ai-core` before accepting v2.9.

# Hyper XSUS Core v6.8 — Recovery Security Validation & Hardening

Adds `recovery-security-validation-v68.js`, a strict read-only
two-pass verifier for trusted anchor health observations.

The verifier requires both observations to be ready and blocker-free,
with nonnegative safe integer counts, lowercase 64-character hexadecimal
hashes and audit count not behind anchor count. It copies count/hash
scalars immediately, avoiding reliance on mutable caller-owned objects.
It compares the two snapshots and returns a frozen result.

The optional incident recovery facade now exposes
`validateTrustedAuditRecoverySecurity()` when a trusted audit anchor
is configured. Existing APIs and their behavior remain unchanged.

Fifteen tests cover valid observations, invalid metadata, changed
state, mutable input objects, known integrity failures, unexpected
storage errors, pending evidence, signed rollback, immutability and
input validation.

Security boundary: read-only validation is advisory, not an atomic
lease, authorization to resume, automatic repair, or an external
monotonic trust authority. Unknown I/O errors propagate.

Run `npm test` on `feature/xsus-ai-core`. Do not mark v6.8
verified until the suite succeeds. The `main` branch is untouched.

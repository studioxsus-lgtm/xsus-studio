# Hyper XSUS Core v3.5 — High-volume incident and durability package

## Delivery
- `recovery-incident-policy.js`: read-only fail-closed decision gate combining
  the v3.4 crash assessor, independent trusted inventory, high-water mark,
  and cryptographic receipt consistency verifier.
- `tests/recovery-incident-policy-v35.test.js`: 28 scenario cases.
- `tests/durable-recovery-stress-v35.test.js`: 10 filesystem integration
  cases including 250 sequential CAS commits, 40 stale-CAS rejections,
  40 invalid fencing tokens, 25 simultaneous lock contenders, signed-state
  corruption and incident assessment.

**Total new cases: 38.** Existing public interfaces and persistent file
formats remain unchanged. All additions target `feature/xsus-ai-core`.

## Security and operational boundaries
A clean diagnostic is not itself cryptographic proof: the policy calls the
signed consistency gate before reporting `safeToResume:true`. An
incomplete or stale-lock state is never automatically repaired.

The local backend remains single-host, and its signed state can still be
rolled back by a privileged adversary unless a separate trusted reference
exists. Neither the policy nor these tests implement distributed consensus,
automatic lock recovery or atomic receipt creation with CAS.

Run `npm test` and examine GitHub Actions output before claiming success.

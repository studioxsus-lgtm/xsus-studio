# Hyper XSUS Core v6.4 — Security Reliability & Stress Verification

This phase adds eight stress/regression tests in
`tests/trusted-anchor-security-stress-v64.test.js`.

Scenarios:
1. 60 sequential signed audit appends and monotonic anchor advancements.
2. 100 parallel read-only health assessments against a stable anchor.
3. 40 competing anchor advancements with exactly one successful CAS.
4. 40 denied reviewer decisions preserving signed checkpoint bytes.
5. 40 parallel health checks preserving checkpoint.pending evidence.
6. 40 parallel health checks preserving checkpoint.lock evidence.
7. 20 signed audit entries followed by valid signed rollback, detected 20 times.
8. 40 fresh anchor instances verifying the same committed checkpoint without mutation.

The tests use isolated temporary directories and independent signing keys
for the audit and anchor. They do not perform destructive operations on
user or production data. No production API changes are made in v6.4.

Limitations: stress tests do not prove freedom from every scheduling race,
filesystem crash boundary or privileged compromise. A locally protected
anchor is not an external monotonic authority. Health assessments remain
advisory, and no automatic repair or authorization is introduced.

Run `npm test` on `feature/xsus-ai-core` to validate the full suite.
Do not mark v6.4 verified until the test run succeeds. The `main`
branch is unchanged.

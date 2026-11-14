# Hyper XSUS Core v6.6 — Operational Reliability & Stress Testing

Adds ten regression and stress tests:
`tests/recovery-operational-reliability-stress-v66.test.js`.

Coverage:
1. Sixty sequential stable two-pass operational checks.
2. Sixty authenticated audit append / trusted anchor advance / verify cycles.
3. Eighty concurrent read-only two-pass checks against stable state.
4. Changed anchor between observations blocks readiness.
5. Changed audit between observations blocks readiness.
6. Forty checks preserve pending checkpoint evidence.
7. Forty checks preserve orphan checkpoint lock.
8. Thirty checks consistently detect signed audit rollback.
9. Known inspection failures remain blocked.
10. Returned operational report and mark snapshots are immutable.

All filesystem fixtures are isolated in temporary directories.
The production v6.5 operational verifier and existing APIs remain unchanged.
No automatic repair, resume authorization, or lock removal is added.

Limits: concurrency and stress tests are not proof of atomic snapshots,
complete crash coverage, or protection from an attacker controlling
both local signing keys and storage. These checks remain advisory.

Run `npm test` on `feature/xsus-ai-core` to validate the entire
test suite. `main` is unchanged. Do not mark v6.6 verified before
test confirmation.

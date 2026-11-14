# Hyper XSUS Core v6.3 — Advanced Security & Fault Injection

v6.3 adds twelve targeted regression tests in
`tests/trusted-anchor-security-fault-injection-v63.test.js`.
No production APIs or recovery authorization rules are changed.

Coverage includes:
1. Tampering with a signed anchor count and tip.
2. Truncated anchor checkpoint and rejection of reinitialization.
3. Signed audit payload modification.
4. Truncated audit snapshot.
5. Audit writer-lock blocking.
6. Audit pending-write residue blocking.
7. Repeated health checks preserving pending evidence.
8. Repeated health checks preserving lock evidence.
9. Twenty simultaneous attempts to advance the same anchor.
10. Twenty denied approvals preserving signed checkpoint bytes.
11. Signed audit rollback detected against retained anchor.
12. Anchor changes detected between health reads.

All test data is isolated in temporary directories and removed after
each test. No test modifies production audit state.

Security boundary: this is single-host authenticated persistence,
not a remote monotonic authority. A privileged attacker with both
signing keys or the ability to roll back both protected stores can
still defeat the local protection. Health checks are read-only
advisories, not atomic leases. This suite does not claim exhaustive
fsync/rename crash injection.

Run `npm test` on `feature/xsus-ai-core` to verify v6.3.
Do not report success before GitHub Actions confirms it.
`main` remains unchanged.

# Hyper XSUS Core v7.1 — Recovery Security Architecture Reliability

This phase adds fourteen regression and reliability tests for the
existing v7.0 coordinated recovery security architecture.

Coverage:
- 50 sequential four-observation assessments on authenticated state.
- 25 sequential signed audit appends, trusted anchor advances and checks.
- 40 concurrent read-only checks against stable signed state.
- Changes between verification phases and on the fourth observation.
- Malformed health responses and explicit security blockers.
- Known signature failures fail closed; unexpected disk errors propagate.
- Fifteen blocked inspections preserve pending checkpoint evidence.
- Fifteen blocked inspections preserve checkpoint writer lock evidence.
- Ten inspections reject signed audit rollback.
- Immutable public reports and constructor validation.

Filesystem scenarios use isolated temporary directories with cleanup.
Long-running stress scenarios have explicit 90-second Vitest timeouts.
No production API or authorization behavior is modified.

Read-only assessment is advisory, not a lease, atomic snapshot,
automatic repair or recovery authorization. Execute `npm test`
on `feature/xsus-ai-core` and confirm the CI result before declaring
v7.1 verified. `main` remains untouched.

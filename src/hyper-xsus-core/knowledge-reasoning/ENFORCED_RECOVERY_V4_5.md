# Hyper XSUS Core v4.5 — Enforced Recovery Safety

Checkpoint promotion now calls the v4.4 read-only readiness
assessment **before reading the trusted checkpoint** and
**again after explicit reviewer authorization**. Promotion is
permitted to proceed only when the assessment reports exactly
one blocker: `UNANCHORED_ARCHIVE_TAIL`, the specific signed
tail that is eligible for reviewer-approved promotion.

A pending checkpoint write, unsafe artifact, orphaned lock,
or other recovery blocker stops promotion. The existing
guard, archive re-verification, CAS and checkpoint confirmation
still run. Existing API signatures are unchanged. Legacy
`XSUS_INCIDENT_PROMOTION_BLOCKED` and
`XSUS_CHECKPOINT_LOCKED` error codes are preserved for
archive lock/no-tail and checkpoint-lock cases, respectively.

Nine regression tests cover clean promotion, pending writes,
both locks, reviewer-time artifact insertion, symlink rejection,
reviewer denial and absent tail.

**Limitations:** no automatic repair or lock cleanup. The
readiness check is not a filesystem transaction: external
processes may still race after the final assessment. This
does not establish power-loss safety or an external trusted
rollback anchor. The new mandatory gate applies to integrated
checkpoint promotion, not to independent direct archive writes
or raw checkpoint adapter calls.

Branch: `feature/xsus-ai-core`; `main` unchanged.
CI verification pending.

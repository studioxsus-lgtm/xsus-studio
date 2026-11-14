# Hyper XSUS Core v5.8 — Audit Recovery & Integrity Verification

Adds `createRecoveryAuditIntegrity({readDurableAudit,directory}).assess({trustedAnchor?})`
and optional integration facade method `inspectDurableRecoveryAudit({trustedAnchor?})`.
The verifier is read-only. It checks the authenticated v5.7 audit reader,
reports stale writer lock/pending crash artifacts, and compares the
current count/tip or authenticated historical prefix with an **externally
trusted** count/tip supplied by the caller.

Possible blockers:
- `AUDIT_UNINITIALIZED`
- `AUDIT_INTEGRITY_REVIEW_REQUIRED`
- `AUDIT_WRITER_LOCK_REVIEW_REQUIRED`
- `AUDIT_PENDING_REVIEW_REQUIRED`
- `AUDIT_ROLLBACK_REVIEW_REQUIRED`
- `AUDIT_ANCHOR_MISMATCH`
- `AUDIT_PREFIX_MISMATCH`

The returned immutable assessment includes `status`, `safeToResume`,
`blockers`, `anchored` and audit `count/tip`. An unanchored clean
audit is marked ready only with respect to local checks; it is NOT
rollback-safe. An anchor must be obtained from an independently
protected monotonic authority, not copied from the same mutable audit
directory. Inspection is not an atomic lease; state can change after
inspection. No automatic cleanup, checkpoint promotion, authorization
or repair is performed.

Twelve tests cover missing/healthy audit, matching/mismatching
anchors, prefix continuity, tampering, crash residue, lock and invalid
inputs. Run `npm test` in GitHub Actions before declaring v5.8 verified.
Branch `feature/xsus-ai-core`; `main` untouched.

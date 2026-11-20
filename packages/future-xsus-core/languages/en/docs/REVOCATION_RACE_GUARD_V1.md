# Revocation Race Guard V1 — Future XSUS Core

Opt-in staged-review guard with registry revision checks before and
after integrity verification, and again after persisting the audit
event. If the candidate is quarantined or its revision changes,
the review result fails closed. Tests inject revocation between
the verification, audit and final read steps.

This is **not atomic** with registry writes or filesystem changes.
A revocation after the final read is still possible. When a revocation
occurs during audit persistence, the previously recorded audit event
may describe an earlier result; the response explicitly sets
`audit_reflects_final_status=False`. No model is deployed or released,
and no artifacts are deleted. For production authorization a trusted,
transactional enforcement boundary would be required.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_revocation_race_guard_v1 -v`

# Integrated Review Report V1 — Future XSUS Core

This optional entrypoint composes the staged review gate, persistent
owner-scoped audit and read-only revoked-artifact cleanup plan.

`build_integrated_review_report_v1(registry, audit, owner_id,
candidate_id, staging_root)`:
1. Runs staged review and persists its audit event.
2. Inspects whether a quarantined artifact warrants manual cleanup.
3. Returns review eligibility, audit sequence, cleanup action and
   explicit denial of release and deletion permissions.

This is not a transaction across the audit and registry databases;
the candidate can be revoked between checks. The report represents
a point-in-time observation, not a continuous integrity guarantee.
It does not authenticate owners, lock files, execute cleanup or
deploy models. A separate trusted enforcement layer is required
for any future release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_integrated_review_report_v1 -v`

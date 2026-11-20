# Revoked Cleanup Plan V1 — Future XSUS Core

This optional, **read-only** planner identifies a staged artifact for a
candidate that the owner-scoped registry already marks `quarantined`.
It derives the expected owner/shard/checkpoint path and uses `lstat`
to reject symlinked directories, symlinked artifacts and unexpected
file types. It never deletes, moves, chmods or modifies files.

Outcomes:
- `no_action`: candidate is not quarantined or artifact is absent.
- `blocked`: unsafe directory or artifact type.
- `review_for_manual_cleanup`: candidate is quarantined and a
  regular staged file exists at the expected location.

Every result has `dry_run=True` and `deletion_authorized=False`.
Manual operators must independently validate the path and current
candidate status. Path inspection is subject to time-of-check/time-of-use
races, and the staging root and its parent directories must be trusted.
This planner does not authenticate owners, inspect file content or
perform any filesystem cleanup. It is not a release mechanism.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_revoked_cleanup_plan_v1 -v`

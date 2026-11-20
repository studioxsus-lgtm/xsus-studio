# Feedback drift detection V1 — Future XSUS Core

New opt-in components:
- `capture_feedback_snapshot_v1` fingerprints accepted, owner-scoped
  feedback records (IDs, status, prompt, history, response) without
  emitting their text in the report.
- `verify_feedback_snapshot_v1` detects a changed accepted set.
- `build_drift_checked_language_candidate_v1` compares before/after
  fingerprints around the existing verified candidate trainer and
  withholds eligibility for human review if drift is detected.

This **does not provide an atomic snapshot**. SQLite reads and
training are not in a single transaction; transient modifications,
review races, and post-check changes are possible. Callers must
quarantine any drifted artifact. The legacy training path remains
available. This module does not authenticate owner identity, classify
semantic content, or authorize production deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_feedback_snapshot_v1 languages.en.tests.test_drift_checked_candidate_v1 -v`

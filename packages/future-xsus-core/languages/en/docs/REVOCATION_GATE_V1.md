# Future XSUS Core — Revocation Gate V1

This optional entrypoint captures an approved-feedback snapshot,
delegates to Frozen Language Candidate V1, then rechecks the approved
set against the original snapshot. It also compares the candidate's
reported snapshot digest and count, and requires the existing candidate
quality gate to report eligibility. Any mismatch or change prevents
eligibility for human review.

**Limits:** this is a completion-time check, not continuous revocation
enforcement. It cannot undo training already performed on data that
was revoked mid-cycle, remove saved artifacts, authenticate the owner,
or prevent a new revocation after checking. The legacy training paths
remain available. A production-grade revocation workflow must
quarantine/delete invalid artifacts and recheck authorization before
release. No automatic promotion is enabled.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_revocation_gate_v1 -v`

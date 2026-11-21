# Candidate Recovery Audit V1

Combines read-only lifecycle journal inspection with bounded inspection
of the candidate, training and report artifacts. It reports missing,
unsafe and oversized files, along with SHA-256 hashes for regular files.
An interrupted or failed journal state is explicitly flagged.

The audit does not infer training success from a `completed` state,
does not authenticate provenance, does not resume training, does not
delete artifacts and cannot authorize deployment. All reports require
human review and separate evaluation of model quality.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_recovery_audit_v1 -v`

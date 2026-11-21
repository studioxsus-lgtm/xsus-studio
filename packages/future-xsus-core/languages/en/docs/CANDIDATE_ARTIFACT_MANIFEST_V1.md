# Candidate Artifact Manifest V1

Creates an in-memory canonical manifest with SHA-256 digests and byte
sizes for the candidate model, training data and report. Verification
re-reads the artifacts and detects changes, missing files and
manifest corruption. Inputs are bounded regular files; symlinks are
rejected by the artifact inspection layer.

The manifest is **not signed**. An attacker able to modify both files
and manifest can recompute the hashes. Do not interpret digest equality
as trusted provenance, model correctness, promotion eligibility or
release authorization. A separate trusted signing process is required
for origin authentication.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_artifact_manifest_v1 -v`

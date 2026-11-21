# Candidate Artifact Inspection V1

Read-only inspection of candidate model, training data and report files
following a failed or interrupted training run. The inventory reports
missing, unsafe, oversized or present files and SHA-256 checksums for
bounded regular files. Symlinks and non-regular files are rejected.

**A checksum is not provenance or model-quality verification.** The
inspection never authorizes resuming training, deploying a model,
or deleting partial artifacts. Review the lifecycle journal and
verify trusted inputs and signed results separately.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_artifact_inspection_v1 -v`

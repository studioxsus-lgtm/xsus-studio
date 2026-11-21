# Candidate Completion Gate V1

This read-only gate combines a completed lifecycle journal, the exact
expected feedback revision and a supplied artifact manifest whose
checksums match the candidate, report and training files.

It returns `ready_for_human_review`, **not** a release decision.
It never resumes training, signs provenance, validates semantic
correctness or deploys a model. A malicious writer able to rewrite
both the manifest and artifacts can bypass digest-only checks.

The gate is a separate explicit verification step after the candidate
training process; existing training APIs are unchanged.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_completion_gate_v1 -v`

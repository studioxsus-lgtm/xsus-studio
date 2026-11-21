# Candidate Cycle Integrated Regression V1

Exercises the real coordinator, SQLite consent and approval gate,
journal, artifact inspection, digest manifest, completion gate and
recovery audit in a temporary directory. The training engine itself
is mocked to create deterministic placeholder files; these tests
**do not demonstrate a real model-learning improvement**.

The integration suite covers successful completion, failure records,
tampering, missing outputs, feedback revision mismatch, human-review
requirements and the no-deployment invariant.

Next milestone: train a real small checkpoint with independent
written-v4 and written-v5 benchmarks, record measured feedback loss
and compare benchmark outcomes before considering any human release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_cycle_integrated_v1 -v`

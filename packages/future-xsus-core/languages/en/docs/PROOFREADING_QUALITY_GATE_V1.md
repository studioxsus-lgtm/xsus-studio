# English Proofreading Quality Gate V1

A strict threshold gate around the existing labeled JSONL proofreading
evaluator. It measures exact status/output match and returns failures
by case ID. It supports sentence, paragraph, document, and copyediting
modes, with configurable minimum case count, minimum exact-match
accuracy and maximum failures.

Tests use generated self-consistency cases to exercise the gate;
**these are not independent evidence of proofreading accuracy**.
For credible quality measurement, supply separately authored, labeled
and held-out examples not derived from engine output. The gate is
read-only, performs no training, and never authorizes deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_quality_gate_v1 -v`

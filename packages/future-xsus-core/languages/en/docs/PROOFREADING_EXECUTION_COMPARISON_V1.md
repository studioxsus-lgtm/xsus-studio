# Proofreading Execution Comparison V1

Execute two proofreading callables against the same labeled JSONL
dataset, sign both observation sets and a reference-label artifact,
verify all three HMAC signatures, and compute exact-match improvements
and regressions. Labels are never supplied to either engine. Dataset
bytes are checked for change between the two runs and reference
construction.

This is **in-process observation, not model identity attestation**.
A caller controls the engines and signing key; the reference file is
not independently trusted or sequestered. A file may change during
individual reads, so use immutable, separately authenticated datasets
for high-assurance evaluation. No training, promotion or deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_execution_comparison_v1 -v`

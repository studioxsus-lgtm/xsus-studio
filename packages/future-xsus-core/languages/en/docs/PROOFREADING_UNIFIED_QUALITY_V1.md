# English Proofreading Unified Quality V1

Reverify reference, baseline and candidate HMAC artifacts and a
dataset-bound signed category manifest. Recalculate overall exact-match
accuracy, improvements and regressions instead of trusting the caller's
reported numbers. Calculate per-category accuracy and fail the gate
when either overall or category thresholds fail.

The caller still supplies the comparison report and its snapshot
verification flags. These flags do **not** constitute independent
attestation of execution, dataset provenance, labels or model identity.
HMAC proves knowledge of a shared key only. No automatic training,
promotion, deployment or release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_unified_quality_v1 -v`

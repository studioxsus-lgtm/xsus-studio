# English Proofreading Regression Comparison V1

Read-only comparison of frozen baseline and candidate predictions
against a common labeled reference. Requires identical case-ID sets,
checks both status and corrected output, reports improvements,
regressions and unchanged outcomes, and enforces configurable
thresholds. It never trains, promotes or deploys.

The supplied dataset SHA-256 is **not independently recomputed**
by this function. Prediction provenance and whether the reference
was kept out of training are not proven. Callers must separately
authenticate dataset content and versioned prediction artifacts.
A passing result is only evidence for the supplied cases.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_regression_comparison_v1 -v`

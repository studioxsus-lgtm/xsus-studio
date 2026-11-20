# Quality Gate V6 — experimental benchmark checks

`evaluate_quality_gate_v6` evaluates the opt-in Context Guard on the
adversarial fixtures and checks explicit limits on false positives,
false negatives, regressions and sample size.

The default thresholds are zero errors and regressions across at least
ten cases. Passing **only** means the supplied hand-labeled fixtures
meet these thresholds. It does not prove correctness on unseen English,
production readiness, semantic understanding or deployment approval.
The gate always reports `deployment_approved: false` and requires
human review. Existing analyzers and production gateways are untouched.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_quality_gate_v6 -v`

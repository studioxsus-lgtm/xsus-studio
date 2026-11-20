# Adversarial four-way matrix (experimental)

`evaluate_adversarial_matrix_v6` compares four filters on ten
deliberately difficult cases, including over-suppression, unhandled
metalinguistic paraphrases, isolated quotations and quoted speech.

It intentionally **does not require perfect accuracy**. It reports
false positives, false negatives, and regressions rather than
silencing them. Some examples are linguistically ambiguous, and
their labels are evaluation assumptions, not universal truth.

The report does not assert production readiness or pass a release
gate. No existing public analyzer, gateway, XSUS App, main, or Hyper
XSUS Core is modified.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_adversarial_matrix_v6 -v`

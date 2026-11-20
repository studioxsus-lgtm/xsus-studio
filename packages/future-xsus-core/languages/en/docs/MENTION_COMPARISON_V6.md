# Future XSUS Core — before/after mention filtering

The experimental `compare_mention_filter_v6` evaluates baseline
explicit contrast and reference cues against the separate, opt-in
mention-aware filter on seven hand-labeled fixtures.

It reports TP/TN/FP/FN, precision, recall, false-positive reduction,
and changes in false negatives for both cue families.

These fixtures are small and specifically designed to exercise
`the word X` mentions. Improvements here do **not** establish
accuracy on unseen text, quotation handling, semantic understanding
or production readiness. The filter is not enabled in production.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_mention_comparison_v6 -v`.

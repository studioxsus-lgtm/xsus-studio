# Future XSUS Core — three-way quotation comparison

The opt-in `compare_quotation_filters_v6` evaluates three methods
on the same 12 hand-labeled challenge cases:

- baseline explicit cue detection;
- mention-aware `the word X` filtering;
- quotation-aware isolated-word filtering.

Each method receives confusion matrices, precision and recall per
cue family. The report includes changes in false positives, false
negatives, and **case-level regressions** between the two filters.

The stress set deliberately includes a paraphrase error that the new
filter does not fix. This prevents a misleading perfect score.

These hand-authored examples are not representative of English
language usage. No production gateway, XSUS App or other core
is modified.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_quotation_comparison_v6 -v`.

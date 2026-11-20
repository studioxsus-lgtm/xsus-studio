# Four-way English surface cue comparison (experimental)

`compare_four_filters_v6` compares baseline, mention-aware,
quotation-aware and indirect-mention filtering against the same
hand-labeled stress fixtures. It reports per-field confusion matrices,
precision, recall, and **case-level corrections and regressions**
for each successive method.

The adversarial fixture set is small and non-representative. A
measured improvement is not evidence of general language understanding
or production readiness. All methods remain opt-in and isolated.

Run from `packages/future-xsus-core`:

`python3 -m unittest languages.en.tests.test_four_way_comparison_v6 -v`

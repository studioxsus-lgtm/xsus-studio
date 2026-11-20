# Context Guard V6 — five-way adversarial comparison

`compare_context_guard_v6` evaluates baseline, mention-aware,
quotation-aware, indirect mention and context guard filters on the
same labeled adversarial fixtures.

The report contains TP/TN/FP/FN, precision and recall per field and
case-level corrections and regressions for the indirect-to-context
guard transition. It also measures changes in false positives and
false negatives. Existing four-way APIs are not changed.

The labels are hand-authored assumptions on a small adversarial set.
They do not establish general English-language accuracy or production
readiness. The Context Guard remains opt-in and isolated from all
existing production routes.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_context_guard_comparison_v6 -v`

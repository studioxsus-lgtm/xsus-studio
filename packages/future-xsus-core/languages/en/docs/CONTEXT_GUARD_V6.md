# Context Guard V6 (experimental)

`analyze_context_guard_v6` is an opt-in alternative to the indirect
mention filter. It recognizes isolated quotations, `the word X`,
and narrow contexts such as `discussed however in class`.
Unlike the earlier broad indirect rule, it retains `mentioned she
would return` and `mentioned however, costs rose`.

This is a surface heuristic, not a syntactic or semantic parser.
It may still misclassify ambiguous or unseen contexts. No existing
analyzer, gateway, main branch, XSUS App or Hyper XSUS Core is modified.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_context_guard_filter_v6 -v`.

# English Syntax–Grammar Integration V1

Tests the existing `analyze_clause` -> `check_grammar` sequence
on eight hand-labeled English sentences, including both acceptable
and subject–verb agreement error examples. The evaluator requires
a unique parse and checks the diagnostic code and replacement.

Limitations: this is a small, developer-visible regression fixture,
not an independent holdout. It does not demonstrate full grammar
coverage, general language accuracy or production readiness.
No training, automatic promotion or release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_syntax_grammar_integration_v1 -v`

# English Auxiliary Grammar Integration V1

Tests the existing `analyze_clause` -> `check_grammar`
pipeline on eight visible sentence fixtures covering auxiliary-led
questions and negated declaratives with *do/does/did*.
Both valid and invalid main-verb forms are represented.
The evaluator checks parsing, diagnostic codes and suggestions,
and reports separate accuracy thresholds per phenomenon.

These are developer-visible regression fixtures, not an
independent blind holdout. They do not establish general grammar
accuracy, production readiness, or release authorization.
No training or engine implementation changes.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_auxiliary_grammar_integration_v1 -v`

# English Syntax Features Direct V1

Exercises the existing `text.syntax.analyze_clause` parser with
twelve hand-selected probes for auxiliary-led questions, negation,
and subject recognition. The report records observed clause features,
not just parser acceptance, with separate thresholds per feature.

This is a developer-visible regression suite, not a blind holdout.
It does not prove general syntactic accuracy or all subject–verb
agreement rules. No engine changes, training, deployment or release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_syntax_features_direct_v1 -v`

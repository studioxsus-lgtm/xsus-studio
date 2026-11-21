# English Grammar Agreement Direct V1

Calls the existing `text.grammar.check_grammar` with explicit
`Clause` objects and real verb inflections from `text.morphology`.
Twelve developer-visible probes cover third-person singular, plural,
and forms of *be*, checking both issue codes and suggested replacements.

These are direct unit probes, **not end-to-end sentence parsing** or
an independent holdout. Auxiliary verb forms and complex clauses
remain future work. No engine changes, training or release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_grammar_agreement_direct_v1 -v`

# English Morphology Direct Suite V1

Runs the existing `text.morphology` inflection and pluralization
functions through the established morphology holdout evaluator.
Twenty explicitly labeled examples cover irregular verbs, regular
verbs, verb spelling, irregular nouns, and regular nouns. Each
phenomenon has a separate minimum-case and accuracy gate.

These are developer-visible, hand-selected regression fixtures, **not
an independent blind holdout**. Passing them does not establish
general morphological competence or correctness outside these cases.
No engine code is replaced and no training or release occurs.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_morphology_direct_suite_v1 -v`

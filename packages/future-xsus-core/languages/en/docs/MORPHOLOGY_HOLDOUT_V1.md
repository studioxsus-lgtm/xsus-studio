# English Morphology Holdout V1

A deterministic, labeled English morphology benchmark for the existing
verb inflection and noun pluralization functions. The reference set
contains 20 examples, including irregular verbs, suffix rules and
irregular plurals. Each case records an ID, lemma, requested form and
expected output; the evaluation returns accuracy, per-case diagnostics,
a dataset SHA-256 fingerprint, and optional baseline regressions.

The benchmark is **not** a training corpus, a proof of unseen-data
generalization, or a production approval. These 20 examples are
small and public in the repository; maintain a separately controlled,
non-training holdout for meaningful independent evaluation.
The evaluator never modifies language engines or promotes candidates.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_morphology_holdout_v1 -v`

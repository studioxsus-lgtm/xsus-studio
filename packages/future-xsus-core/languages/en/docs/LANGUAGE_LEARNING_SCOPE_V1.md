# Future XSUS Core — Language-only learning scope V1

The English core already contains a consent-gated SQLite feedback store
and a candidate-training pipeline in `learning/feedback_store.py` and
`learning/continual.py`. This new module is an **opt-in metadata
preflight**, not a replacement for those systems.

`assess_language_learning_scope_v1` accepts only explicitly declared
English-language learning domains: grammar, morphology, syntax,
vocabulary, orthography, punctuation, and language usage. Inputs must
come from consented feedback or curated corpora and require a human
review decision. General knowledge, programming, and unsupported
languages are rejected.

**Security boundary:** declared metadata can be incorrect or forged.
This function does not inspect the semantic content of examples,
authenticate the reviewer, or enforce authorization within the
existing training pipeline. A future integration must derive source
and approval state from trusted storage, inspect content, and keep
promotion gated. Passing preflight does not authorize production
activation or autonomous code modification.

No changes to main, XSUS App, Hyper XSUS Core or the existing
candidate-training flow.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_language_scope_v1 -v`

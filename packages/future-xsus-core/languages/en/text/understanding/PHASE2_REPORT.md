# Future XSUS Core — Phase 2: bounded sentence meaning (Python)

## First implementation
`sentence_meaning_v1.py` is an **opt-in experimental** English sentence-frame
extractor, separate from the Phase 1 lexical engine and all live routing.
It handles a deliberately small set of single-clause, subject–verb–object
statements. Outputs explicit subject, action lemma, object, and positive/
negative polarity with a machine-readable contract. No user text is returned.

Example:
```python
from languages.en.text.understanding.sentence_meaning_v1 import sentence_frame_dict
print(sentence_frame_dict("The developer builds the application."))
```

This extracts the frame; it does not build an application or execute actions.

## Limits
- Closed vocabulary for subjects, verbs and objects; no open-domain claims.
- Explicit simple negation only (`does not`, `doesn't`, etc.).
- Questions, conjunctions, subordinate clauses, indirect speech, ambiguous
  references, unsupported words and unscoped negation abstain.
- No neural model training, external dependencies, API integration or
  production authorization.
- This is the **start**, not completion, of Phase 2. Next: independent
  sentence-level evaluation, compositional contrasts, paraphrase consistency,
  more syntax coverage, and fail-closed acceptance tests.

## Test
From `packages/future-xsus-core`:
```bash
python -m unittest languages.en.tests.test_sentence_meaning_v1 -v
```

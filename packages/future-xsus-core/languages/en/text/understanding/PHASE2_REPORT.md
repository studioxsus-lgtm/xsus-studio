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

## Expansion: structural comparison and evaluation

`sentence_relations_v1.py` compares two supported sentence frames,
identifying the same explicit frame, opposite explicit polarity, or changed
subject/action/object. These labels **do not** assert logical contradiction,
entailment, or verified world facts. Unsupported frames abstain.

`sentence_meaning_holdout_v1.jsonl` contains 32 authored diagnostic cases:
20 labeled simple statements and 12 expected abstentions. The read-only
`sentence_meaning_benchmark_v1.py` reports aggregate exact-frame metrics,
without input text. This is an authored development benchmark, not an
independent external blind test or production gate.

```bash
python -m unittest languages.en.tests.test_sentence_meaning_v1 languages.en.tests.test_sentence_relations_v1 languages.en.tests.test_sentence_meaning_benchmark_v1 -v
python -m languages.en.evaluation.sentence_meaning_benchmark_v1
```

## Expansion: grammatical agreement and challenge gate

The controlled sentence parser now rejects unsupported positive subject–verb
agreement and incorrect auxiliary agreement in simple negation. It does **not**
claim complete English grammar or general tense analysis.

The 24-case authored challenge includes malformed agreement, unsupported
clauses, negation, questions and supported contrasts. The Phase 2 gate
compares the 32-case diagnostic holdout and this challenge, requiring exact
frames on labeled cases, zero false resolutions on expected abstentions, and
arithmetic integrity. These are **development-authored** tests and may overstate
performance on new text. This is a bounded engineering checkpoint, not an
external evaluation or authorization for deployment.

```bash
python -m languages.en.evaluation.sentence_meaning_quality_gate_v1
```

## Bounded batch processing (opt-in)

`sentence_batch_v1.py` accepts 1–32 explicitly separated sentences with a
maximum of 8192 combined characters, reports individual structured frames and
aggregate counts, and can compare up to 64 explicitly indexed sentence pairs.
Invalid batch shapes, empty sentences, out-of-range indices, booleans used as
indices, and oversized requests raise `ValueError` before any comparison.
No raw source text is returned; fixed vocabulary values can appear in frames.
This does not perform arbitrary paragraph segmentation, document understanding,
logical entailment, or any external action.

```bash
python -m unittest languages.en.tests.test_sentence_batch_v1 -v
```

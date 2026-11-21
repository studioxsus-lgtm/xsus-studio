# Future XSUS Core — Phase 1: English word meaning in context

This opt-in module implements **bounded lexical word-sense disambiguation**. It is
not a general semantic understanding model and does not alter the English
neural checkpoint, router, API, production behavior, or other XSUS cores.

## API

`analyze_word_sense(text, target, window=6)` returns a frozen
`WordSenseResult` with `target`, `sense`, `status`, `confidence`,
`evidence`, and `candidates`. Supported targets are `bank`, `bat`, `crane`, `seal`, `spring`, `python`,
`mouse`, `java`, `port`, `pitch`, `draft`, `scale`, `jam`, and `file`. Evidence is a bounded set of
explicit cue words within the requested token window around each target
occurrence. No raw input or context is returned.

Statuses:
- `resolved`: exactly one sense has strictly more nearby cues for **every**
  occurrence of the target in the input; `low` or `medium` confidence is
  heuristic and is not a calibrated probability.
- `ambiguous`: conflicting top senses, tied evidence, or different senses
  for different mentions.
- `insufficient_evidence`: at least one mention has no local cues.
- `target_absent`: supported target not present in input.
- `unknown`: word not supported by this version.

No fallback to a guessed meaning. This module does not resolve negation,
quotations, irony, morphological variants, entity references, or long-range
discourse. A cue may appear in a negated phrase, so results must not be used
as factual claims or production routing decisions.

## Examples

```python
from languages.en.text.understanding.word_sense_v1 import analyze_word_sense
print(analyze_word_sense("She deposited money at the bank.", "bank"))
print(analyze_word_sense("They sat beside the river bank.", "bank"))
print(analyze_word_sense("I visited the bank.", "bank"))
```

## Verification

Run from `packages/future-xsus-core`:

```sh
python3 -m unittest languages.en.tests.test_word_sense_v1 -v
python3 -m unittest discover -s languages/en/tests -v
```

**Next:** add held-out annotated examples, lexical precision/coverage and
abstention-rate metrics, then expand to inflected forms and sentence-level
context only after evidence of accuracy. This version does not train weights
or claim open-domain comprehension.

## Extended lexical evaluation

The authored diagnostic dataset now contains **63 cases** across 14 words
and 32 defined senses. It is not an external blind holdout. The lexical
benchmark reports per-word counts and the conservative quality gate checks
aggregate thresholds and rejects any incorrect resolved sense. Results
must be interpreted only within this limited dataset.

```sh
python3 -m languages.en.evaluation.word_sense_benchmark_v1
python3 -m languages.en.evaluation.word_sense_quality_gate_v1
```

## Adversarial challenge (separate from release gate)

The additional 48-case authored challenge covers negation, competing cues,
repeated words, and sparse context. It is intentionally **non-gating**:
known limitations should remain visible rather than hiding them to make CI
pass. Run `python3 -m languages.en.evaluation.word_sense_challenge_report_v1`
to inspect aggregate and per-target counts without exposing source sentences.
The existing 63-case diagnostic quality gate remains separate.

The challenge is not externally blind and does not establish real-world
accuracy. In particular, the cue-based model does not understand negation,
so adversarial errors are expected and should guide a future opt-in
context-guard design with regression tests before integration.

## Opt-in context guard v1

`context_guard_v1.py` adds a conservative wrapper that **abstains** when
explicit lexical evidence appears near negation, or a negated contrast occurs.
It cannot infer the correct sense from logical negation and may unnecessarily
abstain on valid examples. It never replaces a sense with a new guessed sense.
The existing `analyze_word_sense` API remains unchanged.

`word_sense_guard_comparison_v1.py` compares the baseline and guarded
versions on the 63-case diagnostic and 48-case challenge. It reports both
prevented errors and correct answers lost to abstention. This is a
non-gating experiment, **not** an authorization to deploy the guard.

```sh
python3 -m languages.en.evaluation.word_sense_guard_comparison_v1
```

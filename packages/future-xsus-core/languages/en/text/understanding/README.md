# Future XSUS Core — Phase 1: English word meaning in context

This opt-in module implements **bounded lexical word-sense disambiguation**. It is
not a general semantic understanding model and does not alter the English
neural checkpoint, router, API, production behavior, or other XSUS cores.

## API

`analyze_word_sense(text, target, window=6)` returns a frozen
`WordSenseResult` with `target`, `sense`, `status`, `confidence`,
`evidence`, and `candidates`. Supported targets are `bank`, `bat`,
`crane`, `seal`, `spring`, and `python`. Evidence is a bounded set of
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

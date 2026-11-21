# Future XSUS Core — Phase 1: English lexical word senses

## Scope
A **bounded experimental milestone** for written-English word-sense
disambiguation in Python. This is not the completion of general language
understanding, production readiness, or all English-language development.

## Delivered
- Independent opt-in lexical classifier: 14 ambiguous words, 32 candidate senses.
- Conservative local cue scoring, per-mention ambiguity handling and abstention.
- Input validation and a read-only, no-network, no-training API.
- 63-case authored diagnostic benchmark and fail-closed diagnostic quality gate.
- 48-case authored adversarial challenge (negation, contrast, ambiguity).
- Experimental opt-in negation/contrast context guard; baseline unchanged.
- Comparative reports expose prevented errors **and** correct answers lost.
- Python unit tests and GitHub Actions; JSON aggregate evidence artifacts.
- Explicit milestone acceptance with CI checks and no release authorization.

## Acceptance contract
Run from `packages/future-xsus-core`:

```bash
python -m unittest languages.en.tests.test_word_sense_v1 languages.en.tests.test_word_sense_benchmark_v1 languages.en.tests.test_word_sense_quality_gate_v1 languages.en.tests.test_word_sense_challenge_v1 languages.en.tests.test_word_sense_context_guard_v1 languages.en.tests.test_word_sense_phase1_acceptance_v1 -v
python -m languages.en.evaluation.word_sense_phase1_acceptance_v1
```

A passing acceptance report means **only** that this experimental Phase 1
lexical deliverable satisfies its explicitly limited engineering criteria.
It does not mean the challenge has no errors or that the guard is suitable
for production. The challenge remains non-gating to make limitations visible.

## Known limitations
- Cue matching is heuristic; it does not perform full compositional semantics.
- Negation, contrast, morphology, reference and multiple target mentions
  remain imperfect; the guard may abstain on correct cases.
- Both datasets were authored during development, not independently blind.
- No claim of open-domain understanding, model training, live routing,
  deployment authorization, or general real-world accuracy.
- Future phases must evaluate sentence meaning, questions, intent,
  dialogue context, and independent external holdouts.

## Boundaries
Keep `future-xsus-core` independent. No edits to `main`, Hyper XSUS Core,
XSUS AI Core, or live XSUS App integration are required for this milestone.

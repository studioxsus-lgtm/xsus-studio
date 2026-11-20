# Future XSUS Core — V6 experimental language analysis

V6 is an **opt-in, rule-based written-English analysis layer**. It is not a
replacement for the existing English model and is not a general-purpose
language understanding system.

## Modules

- `text/semantic_signals.py`: observable token, question and negation signals.
- `text/intent_v6.py`: explicit request-intent classification.
- `text/context_v6.py`: bounded turn summaries and reference flags; no entity resolution.
- `text/quality_v6.py`: formatting and token-limit heuristics; no fact checking.
- `text/pipeline_v6.py`: optional composition of the above signals.
- `text/structure_v6.py`: simple sentence splitting and discourse marker flags.
- `text/clarification_v6.py`: conservative missing-task and unresolved-reference flags.

## Limitations

These components use deterministic heuristics. They cannot reliably parse
arbitrary English, determine truth, resolve pronouns, or execute requests.
V6 modules do not change existing public contracts or route live traffic.

## Verification

Run from `packages/future-xsus-core`:

```bash
python3 -m unittest discover -s languages/en/tests -v
python3 -m unittest discover -s tests/contracts -v
python3 -m unittest discover -s tests/integration -v
```

The GitHub Actions workflow also tests the browser adapter. A green run
confirms that configured checks passed, not that the engine has achieved
open-domain intelligence.

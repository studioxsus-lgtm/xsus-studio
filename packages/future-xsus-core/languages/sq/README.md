# XSUS Albanian Engine — foundation release candidate

Independent written Standard Albanian analysis, isolated from the English engine.

## Implemented scope

| Component | Entry point |
| --- | --- |
| Unicode, alphabet, tokenizer, starter lexicon and marker detection | text.py |
| Explicit morphological paradigms | morphology.py |
| Verb conjugation | verbs.py |
| Noun and pronoun declension | nominals.py |
| Restricted SV/SVO syntax | syntax.py |
| Negation, punctuation-based questions, two-clause coordination | advanced_syntax.py |
| Combined analysis | pipeline.analyze_text |
| Internal coverage diagnostics | quality.evaluate_text |
| Explicit routing | core.routing.sq_analysis_dispatch |
| Typed analysis bridge | core.routing.sq_analysis_contract |
| App-facing Python bridge | core.routing.sq_app_bridge |

The detector is marker-based, not a multilingual classifier. The lexicon and
paradigms are small; unsupported syntax is reported as unknown. Coverage is not
accuracy. This engine does not generate conversation responses or applications.
The App bridge is not connected to the live frontend.

## HTTP integration

POST /v1/language/analyze/sq accepts JSON with exactly text and language
(sq), using the existing owner authentication. Text is limited to 4096
characters. The response contains analysis, quality, language and persisted=false.
The feature is disabled by default. Enable only in an authorized staging
environment with XSUS_SQ_ANALYSIS_ENABLED=true. No production deployment is implied.

## Verification

From packages/future-xsus-core:

```sh
python -m pip install -r requirements-remote.txt
python scripts/test_albanian.py
python -m unittest discover -s tests/contracts -v
python -m unittest discover -s languages/en/tests -v
```

CI runs the above checks across Python 3.11, 3.12 and 3.13.

## Release acceptance gates

- All CI matrix jobs pass for the exact release commit.
- Staging authentication, disabled-state and request validation verified.
- Independent annotated held-out Albanian corpus and accuracy evaluation.
- Documented limitations and human linguistic review.
- Explicit approval before production activation or live App integration.

The foundation is a release candidate, not a production-ready Albanian
conversation engine. No accuracy or deployment claim is made by this document.

## Next development cycle

Expand annotated vocabulary, complete inflection and agreement coverage,
improve detection and contextual disambiguation, and measure held-out accuracy
before expanding the supported production scope.

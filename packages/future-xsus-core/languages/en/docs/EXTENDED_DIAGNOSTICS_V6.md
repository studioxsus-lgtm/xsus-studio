# Future XSUS Core — Extended English Diagnostics V6

`languages.en.text.extended_diagnostics_v6.analyze_extended_v6`
combines the existing V6 dictionary API and four independently tested
surface analyzers: discourse, argument markers, reference signals, and
ambiguity signals.

The original `analyze_text_v6` contract remains unchanged and is
returned under `base`. The new function is opt-in and not exposed by
existing gateway routes or production adapters.

The combined result is JSON-serializable. It does not resolve
references, verify factual claims, establish logical entailment,
generate answers, or execute actions.

Verification: run `python3 -m unittest discover -s languages/en/tests -v`
from `packages/future-xsus-core`.

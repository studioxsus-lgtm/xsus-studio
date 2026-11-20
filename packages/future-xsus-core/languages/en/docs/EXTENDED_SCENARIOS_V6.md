# Extended English V6 — combined regression scenarios

This test package exercises the opt-in `analyze_extended_v6` API
with multi-sentence discourse markers, argument markers, reference
signals, uncertainty cues, lexical overlap, history forwarding, JSON
serialization, input limits and deterministic output.

The tests intentionally distinguish *observed text markers* from
verified semantic relationships. A reference signal is not resolved
coreference, lexical overlap is not coherence, and an argument marker
does not establish truth or validity.

No changes are made to the existing `analyze_text_v6` API, public
gateways, XSUS App, Hyper XSUS Core, or production services.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_extended_diagnostics_scenarios_v6 -v`

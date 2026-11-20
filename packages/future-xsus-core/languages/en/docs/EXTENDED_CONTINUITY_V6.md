# Extended English V6 — bounded continuity integration

The opt-in `analyze_extended_v6` response now includes a `continuity`
field derived from `analyze_continuity_v6(text)` with default lookback 2.
The existing `base` result and original `analyze_text_v6` API are
unchanged. The extension is not exposed through public gateway routes.

Continuity links capture only shared lexical terms and explicit
pronoun/demonstrative cues. They do not establish semantic continuity,
resolve referents, or verify facts. The existing contract version
`6.0.0-experimental-extended` remains unchanged; this is an
additive change to an experimental opt-in API.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_extended_continuity_v6 -v`.

# Future XSUS Core — quotation-aware cue filtering

The opt-in `analyze_quotation_filter_v6` suppresses explicit contrast
and reference cues when they appear as isolated quoted words, including
straight and curly quotes. It also retains the narrow `the word X`
mention rule. Cues in longer quoted utterances are retained, since
the module cannot determine whether quoted speech is metalinguistic.

The result includes suppressed cue reasons and an uncertainty flag for
unmatched quote delimiters. This is a heuristic, not a quotation parser,
semantic model, or coreference resolver. Nested and complex quotations
are not supported.

This module is isolated: it does not modify existing public analyzers,
the experimental gateway, XSUS App, Hyper XSUS Core, or main.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_quotation_filter_v6 -v`.

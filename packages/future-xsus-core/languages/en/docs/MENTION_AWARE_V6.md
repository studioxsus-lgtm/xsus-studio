# Future XSUS Core — mention-aware surface filtering

The experimental, opt-in `analyze_mention_aware_v6` recognizes a
narrow pattern: `the word however` and `the word she` (and other
single-word cues). It suppresses a cue only when every matching
occurrence in the sentence is an explicit `the word X` mention.
It retains cues that also appear in ordinary text.

This rule is deliberately conservative and incomplete: it does not
understand quotations, word senses, coreference or discourse semantics.
It may miss multiword contrast cues and other metalinguistic phrasing.
It is **not** wired into the existing public analyzers or gateways.

Run `python3 -m unittest languages.en.tests.test_mention_aware_signals_v6 -v`
from `packages/future-xsus-core`.

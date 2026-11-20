# Future XSUS Core — indirect mention filter

Experimental, opt-in `analyze_indirect_mention_v6` extends the
quotation-aware surface cue filter to a narrow pattern:
`mentioned X` or `referred to X`, where X is a single cue word.

This does not model grammar or meaning, and may incorrectly suppress
genuine uses of a cue after these verbs. It is intentionally isolated
from existing public analyzers, gateways, and XSUS App. It does not
modify main or Hyper XSUS Core.

The returned diagnostics include a suppression reason. Run from
`packages/future-xsus-core`:

`python3 -m unittest languages.en.tests.test_indirect_mention_filter_v6 -v`

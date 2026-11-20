# Temporal Mention Filter V6 (experimental)

This opt-in filter extends Context Guard with the deliberately narrow
pattern `discussed X yesterday`, where X is one English cue word.
It preserves other occurrences in separate sentences.

This is not a general metalinguistic parser and can misclassify
ambiguous examples. No existing filter or public gateway is changed.
No production activation is authorized.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_temporal_mention_filter_v6 -v`

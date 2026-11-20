# Future XSUS Core — challenge benchmark V6

The opt-in `evaluate_challenges_v6` groups 12 independently specified
expected outcomes into four categories: paragraph boundaries, contrast
cues, reference cues, and mixed documents.

It reports per-group accuracy, per-field accuracy, field-specific
failure counts, and weighted accuracy over all labeled cases.
It rejects duplicate group names and case names to prevent
accidental double counting.

These are hand-written fixtures that primarily exercise known surface
patterns. A high score is **not** a measurement of semantic
understanding or performance on unseen natural-language data.
The next step is independently annotated, diverse evaluation data,
including negative cases and ambiguous boundaries.

No production gateway, XSUS App, Hyper XSUS Core, or main branch
is modified. Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_document_challenge_v6 -v`.

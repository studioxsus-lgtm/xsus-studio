# Future XSUS Core — paragraph structure diagnostics

The opt-in `analyze_paragraphs_v6` function segments text at blank
lines, counts words and heuristic sentences per paragraph, detects a
small set of explicit opening transitions, and reports shared lexical
terms between adjacent paragraphs.

This is not an assessment of document quality or logical coherence.
Line-break conventions, abbreviations, headings and non-English text
may produce uncertain results. Input is limited to 10,000 characters.
No production gateway, public contract or other engine is changed.

Run `python3 -m unittest languages.en.tests.test_paragraph_structure_v6 -v`
from `packages/future-xsus-core`.

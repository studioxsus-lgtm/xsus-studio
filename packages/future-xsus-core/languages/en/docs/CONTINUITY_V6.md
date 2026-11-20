# Future XSUS Core — bounded English continuity cues

`analyze_continuity_v6(text, lookback=2)` identifies explicit
shared non-stopword terms between sentences within a bounded lookback
window, plus pronoun and demonstrative cues in the target sentence.

It is an independent, opt-in analysis module. It does **not** resolve
pronouns, infer semantic relations, or prove coherent discourse.
Sentence boundaries use the existing heuristic segmentation and carry
forward its uncertainty flag. The lookback is restricted to 1–8
sentences and input text to 10,000 characters.

No existing V6 public API, gateway, production integration, other
language engine or deployment is changed.

Run `python3 -m unittest languages.en.tests.test_continuity_v6 -v`
from `packages/future-xsus-core`.

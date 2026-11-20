# Future XSUS Core — mention-filter stress evaluation

The opt-in `evaluate_mention_stress_v6` evaluates 12 labeled
examples in six groups: control, literal mentions, actual use,
mixed mention/use, quotation and paraphrase.

Unlike an optimistic regression-only suite, this evaluation **expects
and reports known errors** in quotation and paraphrase cases. A
failing prediction becomes a structured failure record; it does not
silently disappear from the score.

The set is small, hand-authored, and designed to expose weaknesses.
It is not representative of English usage, and its accuracy is not
a production readiness metric. No production gateway or existing
analyzer is modified.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_mention_stress_v6 -v`.

# Future XSUS Core — explicit-signal error audit

`audit_document_errors_v6` produces TP/TN/FP/FN counts,
precision and recall for the two boolean surface labels
`has_contrast` and `has_reference`. Undefined precision or recall
is represented by JSON null, not a misleading perfect score.

The adversarial fixture deliberately includes two **known false
positives**: the words "however" and "she" mentioned as literal
words rather than used as discourse or reference markers.
The audit reports these errors rather than concealing them.

This is a narrow, hand-authored evaluation. It is not a claim of
general linguistic understanding or a representative accuracy score.
The existing analyzers and gateways are unchanged.

Run `python3 -m unittest languages.en.tests.test_error_audit_v6 -v`
from `packages/future-xsus-core`.

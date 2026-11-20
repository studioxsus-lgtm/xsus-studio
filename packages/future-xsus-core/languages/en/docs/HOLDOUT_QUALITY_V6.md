# Future XSUS Core — separate challenge-set quality check

`evaluate_holdout_quality_v6` runs the existing experimental quality
gate against ten *additional* hand-authored examples not included in
the original adversarial matrix. This is a challenge set, not a
statistically independent or representative held-out corpus.

The strict gate is expected to **fail** on unhandled indirect mentions.
Tests verify that this failure is reported correctly; they do not
pretend the filter passed. Thresholds may be adjusted explicitly,
but deployment approval always remains false.

No production gateway, main branch, XSUS App, or Hyper XSUS Core is
changed. Run from `packages/future-xsus-core`:

`python3 -m unittest languages.en.tests.test_holdout_quality_v6 -v`

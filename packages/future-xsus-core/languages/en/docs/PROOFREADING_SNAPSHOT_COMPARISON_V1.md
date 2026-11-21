# English Proofreading Snapshot Comparison V1

The complete evaluation dataset is read once, parsed into a frozen
snapshot and compared against a separately supplied trusted SHA-256.
Both engines receive only input text from that snapshot. Expected
labels remain in memory and are used only for scoring. Reference,
baseline and candidate observations are HMAC-signed and verified
before calculating improvements and regressions.

This prevents mutable-file drift *within one evaluation*. It does
not authenticate the engine binary, prove the trusted hash's origin,
or prove that labels were excluded from training. A caller with the
signing key can forge artifacts. No automatic training, promotion,
release or deployment is permitted.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_snapshot_comparison_v1 -v`

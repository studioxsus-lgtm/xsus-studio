# Authenticated English Proofreading Prediction Artifacts V1

HMAC-SHA256 authenticated snapshots of versioned, canonical
proofreading predictions. Comparison verifies the signatures of
reference, baseline, and candidate, requires distinct version labels
and identical dataset fingerprints, then calculates exact-match
improvements and regressions. Neither evaluation nor signing
triggers training, promotion, or deployment.

**Trust limits:** An HMAC signature authenticates knowledge of a
shared secret, not the real identity of the signer or that a model
actually generated the predictions. The dataset digest is supplied by
the caller; it is not recomputed against trusted dataset bytes here.
Compromised signing keys can forge snapshots. Use independently
controlled dataset storage and execution attestation for stronger
guarantees. Never put the signing key in the repository.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_prediction_artifact_v1 -v`

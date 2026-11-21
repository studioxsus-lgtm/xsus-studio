# Signed English Proofreading Category Manifest V1

HMAC-SHA256 authenticates canonical case-to-category assignments
bound to one dataset SHA-256 fingerprint. The verifier rejects
tampered labels, duplicate IDs, reordered assignments, unknown
fields and invalid signatures. An optional reporting adapter
checks that reference, baseline and candidate artifacts declare
the same dataset fingerprint before computing per-category metrics.

**Trust limitations:** HMAC authenticates possession of a shared
secret, not the identity of the signer or independent correctness
of the category labels. The reporting adapter does not reverify
prediction artifacts or execution provenance; use it only with
a trusted, previously verified comparison report. A matching
digest must come from separately controlled trusted data.
No automatic release, promotion, training or deployment.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_category_manifest_v1 -v`

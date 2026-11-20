# Audit Anchor Archive V1

Versioned local archive of HMAC-SHA256 audit head checkpoints.
Each owner/candidate/version has a distinct file, created exclusively
and never overwritten by the public API. A checkpoint must verify
against the current chain before it is archived. Versions are strictly
validated (v1, v2, ...); listing is sorted numerically and does not
constitute proof that no historical version was removed.

After the chain advances, an older checkpoint intentionally fails
exact-head verification. It remains useful as historical evidence,
but validating a historical prefix requires a separately designed
prefix-verification interface. The archive does not automatically
rotate keys or establish a trusted external storage boundary.
Filesystem administrators can still delete or replace local files.
The secret key must be independently protected.

No candidate promotion or model release is authorized.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_anchor_archive_v1 -v`

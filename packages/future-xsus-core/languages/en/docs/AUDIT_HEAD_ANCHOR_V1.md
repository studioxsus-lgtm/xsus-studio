# Audit Head Anchor V1 — Future XSUS Core

An HMAC-SHA256 checkpoint binds an owner, candidate, event count and
verified chain head to an independently supplied secret key. The
result is a portable JSON-compatible object. Verification checks the
HMAC in constant time, the live chain integrity, exact event count,
head and scope. Truncation or append after checkpoint causes a
fail-closed mismatch until a new checkpoint is explicitly issued.

**Important trust boundary:** this module does NOT upload or store
the checkpoint outside SQLite. The caller must retain the checkpoint
in an independent trusted location and protect the HMAC key
separately from the chain database. A privileged attacker with both
the key and the checkpoint can forge a replacement. A signed
checkpoint is not an external transparency log. HMAC uses a shared
secret and does not provide public verifiability. The module
does not automatically rotate keys or authorize any model release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_head_anchor_v1 -v`

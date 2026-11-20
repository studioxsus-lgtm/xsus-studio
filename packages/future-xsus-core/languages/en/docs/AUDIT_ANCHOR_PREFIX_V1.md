# Audit Anchor Prefix V1

Verifies an HMAC-SHA256 audit checkpoint against the matching historical
prefix of a *current* chain. Unlike exact-head verification, a valid
checkpoint for the first N events remains valid after later receipts
are appended. The entire current chain is checked for link integrity,
not just the anchored prefix.

The checkpoint must have a valid signature under an independently
managed key and match owner/candidate scope. Truncated, corrupted,
reordered, or substituted prefixes fail closed. The archived variant
loads a versioned local checkpoint without modifying it.

**Limits:** This does not prove that no checkpoint version was deleted,
nor that the local archive is independently trusted. It does not
verify that the chain is synchronized with the separate audit DB;
use the audit-chain reconciliation checker for that. It is a
point-in-time read, not a cross-database atomic snapshot. A privileged
attacker controlling both the signing key and archive can forge
history. No candidate is authorized for release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_anchor_prefix_v1 -v`

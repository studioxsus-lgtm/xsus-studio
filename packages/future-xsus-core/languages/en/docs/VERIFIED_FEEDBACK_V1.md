# Verified Feedback V1 — Future XSUS Core

This opt-in preflight verifies that every supplied example ID belongs
to the specified owner and has status `accepted` in the persistent
SQLite feedback store. It also checks the declared English language
learning domain. Pending, rejected, missing and cross-owner records
fail closed.

**Limitations:** This does not authenticate the owner ID, verify the
reviewer's real-world identity, prove that the example's text is
linguistic, or start training. The caller must obtain owner identity
from trusted authentication. The existing training entrypoints are
unchanged, so this is not universal enforcement. The SQLite store
currently records a review status, not a cryptographic provenance
attestation. No production deployment or self-modifying behavior is
enabled.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_verified_feedback_v1 -v`

# Candidate Quarantine V1 — Future XSUS Core

The optional policy `decide_candidate_quarantine_v1` consumes a
Revocation Gate V1 report and returns one of:
- `quarantined`: report invalid, feedback changed, candidate snapshot
  mismatched, quality gate failed, or release flags are unsafe.
- `pending_human_review`: the supplied report passes all required
  checks. **This is not release authorization.**

The `assess_language_candidate_v1` entrypoint composes the existing
revocation-gated candidate training with the new advisory decision.

Security boundaries: the policy reads a Python dictionary, not a
cryptographically signed or independently authenticated report.
It does not quarantine artifacts on disk, remove model checkpoints,
lock a release registry, authenticate the caller, or provide a
continuous revocation guarantee. Integrators must enforce quarantine
at the artifact/release boundary, and revalidate before release.
Neither outcome enables automatic production activation.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_quarantine_v1 -v`

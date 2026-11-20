# Artifact Staging V1 — Future XSUS Core

Opt-in content-addressed local staging for English candidate
checkpoints. `stage_candidate_artifact_v1` verifies the owner-scoped
registry status and the source SHA-256, then copies bytes to an
owner-separated staging directory, verifies the copy, and rechecks
the candidate status. Hard-link creation prevents an existing
destination from being silently replaced by a concurrent stage.
`verify_staged_candidate_v1` rehashes staged bytes and consults
the latest candidate status before human review.

This is **not** a release pipeline. Staged bytes can still be
modified by processes with filesystem write access. A revocation
after staging does not delete the staged copy. The staging root must
be a trusted local directory; untrusted ancestors and hostile local
filesystem writers are outside this initial threat model. The
registry does not authenticate owners or authorize production.
No model is automatically activated.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_artifact_staging_v1 -v`

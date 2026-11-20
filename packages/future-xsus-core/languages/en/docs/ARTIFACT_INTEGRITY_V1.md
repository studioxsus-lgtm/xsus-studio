# Artifact Integrity V1 — Future XSUS Core

The opt-in `digest_candidate_artifact_v1(path)` computes a SHA-256
digest of a nonempty, regular checkpoint file (maximum 256 MiB).
It rejects symlinks on platforms supporting O_NOFOLLOW and checks
file metadata before and after reading.

`verify_candidate_artifact_v1(registry, owner_id, candidate_id, path)`
reads the owner's candidate record, hashes the actual file and compares
the digest with the registered candidate ID. A matching file can only
be eligible for **human review**, never for automatic release.
Quarantined candidates remain ineligible even with valid bytes.

Limitations:
- Candidate ID must already be the SHA-256 of artifact bytes; this
  module does not rewrite existing candidate IDs or migrate records.
- A hash match does not establish trusted provenance, model safety,
  semantic language-only scope or owner authentication.
- A local file can change immediately after verification; the file
  is not locked or atomically staged into a release service.
- The registry remains advisory and always denies release. No
  deployment path, production model promotion, or filesystem
  quarantine is enabled.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_artifact_integrity_v1 -v`

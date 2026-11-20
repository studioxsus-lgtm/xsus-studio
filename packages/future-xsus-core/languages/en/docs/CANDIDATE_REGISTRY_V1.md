# Candidate Registry V1 — Future XSUS Core

`SQLiteCandidateRegistryV1` is an opt-in, persistent SQLite registry
for owner-scoped English candidate decisions. A candidate ID is a
64-character lowercase SHA-256 identifier supplied by the caller.

- `register(owner_id, candidate_id, decision)` stores a new candidate
  with its quarantine or pending-review decision, rejecting overwrites.
- `get` and `history` return only owner-scoped records.
- `quarantine(owner_id, candidate_id, reason)` makes an irreversible
  transition to quarantine and appends a revisioned event in the same
  SQLite write transaction. Repeated reasons are idempotent.
- `release_check` always denies release.

This is a decision registry, not an artifact store or release service.
It does not validate that the supplied candidate ID matches model
bytes, authenticate the owner, physically quarantine checkpoint files,
sign audit events, or authorize deployment. A future integration must
bind verified artifact digests and release permissions and enforce
the registry at every serving boundary.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_registry_v1 -v`

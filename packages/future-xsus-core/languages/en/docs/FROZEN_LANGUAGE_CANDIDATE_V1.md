# Frozen Language Candidate V1 — Future XSUS Core

An opt-in candidate entrypoint captures owner-approved English
feedback as immutable records, checks the declared language domain,
verifies the selected IDs against SQLite, and supplies a read-only
accepted-record adapter to the existing `build_candidate` pipeline.
The trainer's `accepted()` call uses the frozen records rather than
re-querying the live database. Training, replay, holdout validation
and candidate benchmark gates remain in the existing trainer.

Limitations:
- Owner identity is caller-supplied and must be authenticated upstream.
- Domain is declared metadata, not semantic content inspection.
- Snapshot capture and ID re-verification are separate reads; a
  concurrent revocation can occur after verification. This entrypoint
  does not guarantee immediate revocation or serializable training.
- The original trainer can still be called directly; no global
  enforcement or production activation has been added.
- The frozen adapter is private and must not be used as a general
  writable SQLite store.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_frozen_candidate_v1 -v`

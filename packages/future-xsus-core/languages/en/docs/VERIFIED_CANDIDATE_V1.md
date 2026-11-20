# Future XSUS Core — Verified Language Candidate V1

`build_verified_language_candidate_v1` is a new **opt-in** English
candidate-training entrypoint. It retrieves all accepted feedback IDs
from the owner-scoped SQLite store, checks at least five are present,
then re-verifies their accepted status and the declared linguistic
domain through Verified Feedback V1 before invoking the existing
`build_candidate` learning pipeline.

The underlying trainer still performs its own feedback holdout,
benchmark non-regression checks and candidate-report generation.
This wrapper does **not** promote a candidate into production.

Security limitations: caller-supplied owner identity is not
authenticated; linguistic scope is declared metadata, not content
classification; concurrent changes between verification and training
are not covered by a single transaction. The old training entrypoints
remain available, so this is not a global authorization boundary.
Production integration must use trusted authentication and a
transactionally consistent snapshot.

No changes to main, XSUS App, Hyper XSUS Core, or production activation.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_verified_candidate_v1 -v`

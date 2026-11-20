# Future XSUS Core — Scoped Candidate V1

The opt-in `build_scoped_language_candidate_v1` entrypoint checks
declared English learning domain, source and human approval before
delegating to the existing `build_candidate` training pipeline.
It requires at least five accepted feedback examples in the
owner-scoped SQLite store. Existing training still performs its
separate holdout and benchmark checks.

**Limitations:** the domain/source/approval flags are supplied by the
caller, not cryptographically attested or semantically verified.
This wrapper must not be exposed to untrusted callers as an
authorization boundary. A trusted application layer must derive
approval and provenance from authenticated records. The old training
entrypoint is unchanged and can still be invoked directly; therefore
this is not repository-wide enforcement. No automatic production
promotion or code self-modification is enabled.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_scoped_candidate_v1 -v`

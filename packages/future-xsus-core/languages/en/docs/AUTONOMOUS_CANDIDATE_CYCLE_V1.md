# English Autonomous Candidate Cycle V1

This is an **opt-in candidate-training coordinator**, not autonomous
production learning. It uses the existing consent-gated, owner-scoped
SQLite feedback store, verified-feedback scope checks, replay-based
`continual.build_candidate`, held-out feedback loss and the written-v4
and written-v5 benchmark gates.

`plan_autonomous_candidate_cycle_v1(store, request)` performs a
read-only preflight and reports approved example count and revision.
`execute_autonomous_candidate_cycle_v1(..., approved_execution=True)`
explicitly opts into a training run, then checks that the feedback
revision used by the trainer still matches the preflight snapshot.
No code path here deploys or activates a candidate.

The coordinator does **not** independently authenticate the caller,
prove the semantic truth of approved feedback, attest training code
execution, or guarantee that training outputs are rolled back if a
post-training verification fails. The report's eligibility is for
human review only. No automatic promotion or release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_autonomous_candidate_cycle_v1 -v`

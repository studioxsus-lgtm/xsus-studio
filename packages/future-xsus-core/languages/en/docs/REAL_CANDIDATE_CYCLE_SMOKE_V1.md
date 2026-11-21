# Real Candidate Cycle Smoke V1

Runs a real, small neural model update through the opt-in autonomous
candidate coordinator, using five consented approved feedback examples,
a six-example replay corpus, one training epoch and a tiny checkpoint.

The test exercises actual model training, checkpoint serialization,
loss calculation, feedback revision and lifecycle journal completion.

**Limitations:** the two benchmark loaders and scorers are patched to
return deterministic fixture results. This test does not independently
measure language accuracy, generalization, or promotion eligibility.
A separate real written-v4 and written-v5 evaluation must be executed
before making any improvement claim.

No model is activated or deployed.

Run from `packages/future-xsus-core`:

`python3 -m unittest languages.en.tests.test_real_candidate_cycle_smoke_v1 -v`

# Candidate Cycle Recovery V1

A leftover `running` journal means the previous training run may
have crashed or lost its coordinator. The operator must confirm the
expected feedback revision and explicitly acknowledge recovery.
While holding the same exclusive training lock, the recovery action
marks the journal `interrupted`. It never resumes training, deletes
artifacts, approves a model or deploys anything.

The training coordinator may subsequently start a new explicitly
approved run after reviewing partial artifacts. The journal is
not a signed provenance or distributed transaction log; recovery
cannot prove that partial outputs are safe. Restrict filesystem
access and review model/report files before any further use.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_candidate_cycle_recovery_v1 -v`

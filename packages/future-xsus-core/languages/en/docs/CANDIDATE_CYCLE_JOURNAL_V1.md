# Candidate Cycle Journal V1

An atomic, fsync-backed lifecycle record next to the candidate report
marks training as running, completed, failed or interrupted. Inspection
never resumes training or deploys a model. A leftover running record
signals a possible crash and requires explicit recovery.

The journal is not a signed provenance record or a transaction across
model, report and training files. A malicious local writer or separate
host can bypass it. Use the exclusive candidate lock and private
workspace; verify output artifacts separately before release.

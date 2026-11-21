# Proofreading Dataset Snapshot V1

Load and validate labeled English JSONL exactly once into an immutable
in-memory snapshot of raw bytes and case tuples. Compute SHA-256 and
compare against a separately supplied trusted digest. This avoids
inconsistent repeated reads of a mutable file in a single evaluation.

**Trust boundary:** A digest supplied by the same untrusted caller as
the dataset does not establish independent trust. The trusted digest
must be obtained through a separately controlled process. The frozen
snapshot is immutable at the dataclass level (bytes and tuples), not
an authenticated source of ground truth by itself. No training,
automatic model promotion, or deployment is authorized.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_dataset_snapshot_v1 -v`

# XSUS English Continual Learning

This package has an opt-in, local learning cycle for improving the English
written-response model from reviewed corrections. It produces a new candidate
checkpoint; it never replaces the active model or edits a published profile.

## Learning cycle

1. The owner provides a local JSONL file using the existing training format:
   `{"prompt":"...","response":"..."}`. Optional `history` uses ordered
   `user` and `assistant` turns.
2. `ingest` requires the explicit `--consent` flag. Examples are stored in a
   local SQLite database, scoped by `owner-id`, with a 24,000-character limit.
   New examples remain `pending`; they are not training data yet.
3. A reviewer approves or rejects each pending example. Rejected examples are
   excluded. Conflicting approved answers for the same conversation stop the
   learning cycle until the conflict is removed.
4. `learn` warm-starts from the written-v5 checkpoint, splits approved feedback
   into training and held-out portions, and mixes the training portion with a
   deterministic sample from the curated training corpus to reduce forgetting.
5. The candidate is evaluated on both written-v4 and written-v5 holdouts. It is
   marked eligible only if it improves held-out feedback loss and does not
   reduce accepted cases or preserved facts on either benchmark. The report
   records the baseline and candidate revisions, counts, scores, losses, and
   any blocking reason.

## Use

Place approved examples in a local JSONL file and choose a private database path.
The commands print example IDs and review status, not the stored example text.

```sh
python -m languages.en.learning.cli --store /private/xsus-en-feedback.sqlite3 --owner-id local-owner ingest --input /private/approved-examples.jsonl --consent
python -m languages.en.learning.cli --store /private/xsus-en-feedback.sqlite3 --owner-id local-owner review --example-id EXAMPLE_SHA256 --decision accept
python -m languages.en.learning.cli --store /private/xsus-en-feedback.sqlite3 --owner-id local-owner learn --candidate /private/xsus-en-candidate.json.gz --report /private/xsus-en-candidate-report.json
```

At least five approved examples are required so one can be withheld from
training. Candidate files and private feedback databases should be kept outside
the repository. `eligible_for_promotion` is a quality-gate result, not an
automatic release: a human must review the report and explicitly promote a
checkpoint through the separate model registry.

For an explicit local release, the registry checks the candidate digest, the
exact confirmation revision, the baseline revision, the feedback-loss gate,
and both held-out benchmarks again before storing an immutable checkpoint:

```sh
python -m languages.en.models.registry_cli --registry /private/xsus-en-models promote --candidate /private/xsus-en-candidate.json.gz --report /private/xsus-en-candidate-report.json --confirm-revision sha256-CANDIDATE_DIGEST
python -m languages.en.models.registry_cli --registry /private/xsus-en-models releases
python -m languages.en.models.registry_cli --registry /private/xsus-en-models active
python -m languages.en.models.registry_cli --registry /private/xsus-en-models show --revision sha256-CANDIDATE_DIGEST
```

The registry stores the reviewed JSON report beside the immutable checkpoint,
keyed by its SHA-256 digest. `show` verifies that digest before displaying the
report, and `releases` lists the local report path and digest for every release.
The report contains benchmark and training metadata, not prompt or response
text.

Start the English engine with `XSUS_EN_MODEL_PROFILE=active` and
`XSUS_EN_MODEL_REGISTRY=/private/xsus-en-models` to load the registered active
revision. Rollback requires both the target revision and the exact currently
active revision; the registry records each promotion and rollback event.
For another learning cycle, use the verified active checkpoint path printed by
`active` as the `learn --baseline` argument. The registry rejects candidates
trained from a stale baseline.

## Current boundary

This is controlled continual fine-tuning of the existing small local neural
model. It does not collect data from users automatically, access the network,
rewrite its own source code, or promote a model without release review. The
quality gate checks defined held-out tasks; it cannot prove general English
quality or factual correctness beyond those checks.

# Official Written Comparison V1

A read-only evaluator compares two existing English model checkpoints
against the repository's **actual** `evaluation/quality-v4.jsonl` and
`evaluation/quality-v5.jsonl` cases. It reports baseline and candidate
acceptance, exact matches, fact preservation and per-benchmark deltas,
plus SHA-256 fingerprints of the official benchmark files.

From `packages/future-xsus-core`:

```bash
python3 -m languages.en.evaluation.official_written_comparison_v1 \
  --baseline languages/en/models/checkpoints/xsus-en-written-v4.json.gz \
  --candidate /path/to/trained-candidate.json.gz
```

The candidate must be an existing separately trained checkpoint.
The command does not train, modify or release a model. Test fixtures
mock the checkpoint scorer only to validate the report contract;
real benchmark scores must come from running this command with real
checkpoint paths. Passing unit tests does not demonstrate improved
language performance. Release always requires human approval.

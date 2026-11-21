# Official Written Evidence V1

The command evaluates existing baseline and candidate checkpoints on
the repository's official `quality-v4.jsonl` and `quality-v5.jsonl`
benchmarks, validates measured deltas and emits JSON with both
checkpoint SHA-256 fingerprints.

From `packages/future-xsus-core`:

```bash
python3 -m languages.en.evaluation.official_written_evidence_v1 \
  --baseline languages/en/models/checkpoints/xsus-en-written-v4.json.gz \
  --candidate /path/to/trained-candidate.json.gz \
  > official-evidence.json
```

This command requires a real candidate checkpoint. No performance
numbers are claimed until the command has actually run and its output
has been reviewed. Tests mock the comparison to verify orchestration;
they do not measure model improvement.

The evidence is not cryptographically signed and does not authorize
deployment. Do not include private feedback text in public reports.

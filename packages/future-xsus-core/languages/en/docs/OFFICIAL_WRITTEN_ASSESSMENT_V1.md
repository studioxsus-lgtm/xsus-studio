# Official Written Assessment V1

This read-only assessment validates the comparison report contract,
requires both official written-v4 and written-v5 benchmark entries,
checks bounded integer metrics and recomputes all deltas.

It flags acceptance or fact-preservation regressions per benchmark,
reports total acceptance changes and refuses contradictory release or
deployment claims. Equal aggregate acceptance is reported as no net gain.

The assessment is **not** an independent evaluation. It evaluates
already measured scores and does not establish trustworthy provenance
for the comparison report. It cannot authorize a release.

To generate actual measurements, first run the separate
`official_written_comparison_v1` command with real baseline and
candidate checkpoints. Do not interpret passing unit tests as
evidence that the candidate improved.

# Synthetic Feedback Experiment V1

A reproducible and deliberately small **real neural training** experiment.
It uses five synthetic approved feedback records, a six-example synthetic
replay corpus, a tiny seeded neural baseline, one epoch and two one-case
synthetic held-out benchmarks. No trainer, generator, or scorer is mocked.

The experiment measures held-out feedback loss before and after training,
and the accepted/exact-match scores on both synthetic holdouts. It writes
only aggregate measurements to its public JSON output. All temporary
checkpoints, feedback records and private-style fixtures are discarded.

Run from `packages/future-xsus-core`:

```bash
python -m languages.en.learning.synthetic_feedback_experiment_v1 \
  --output synthetic-feedback-experiment-v1.json
```

GitHub Actions runs the experiment and uploads its JSON artifact.

**Important:** A positive change in this tiny synthetic experiment does
not demonstrate general language-learning capability or transfer to
real-world feedback. A negative or unchanged change must be reported,
not hidden. The model is never deployed and release remains manual.

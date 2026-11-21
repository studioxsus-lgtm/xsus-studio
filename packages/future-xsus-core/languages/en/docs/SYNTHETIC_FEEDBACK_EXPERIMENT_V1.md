# Synthetic Feedback Experiment V1

A reproducible and deliberately small **real neural training** experiment.
It uses twelve synthetic approved feedback records, a 24-example synthetic
replay corpus, a tiny seeded neural baseline, two epochs and two ten-case
synthetic held-out benchmarks (20 cases total). No trainer, generator, or scorer is mocked.

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

## First measured CI result

GitHub Actions run 44875094920 recorded feedback loss 5.58624479 before
training and 5.44985503 after training (delta -0.13638976).
**Neither of the two single-case synthetic holdouts improved:**
baseline accepted 0/2, candidate accepted 0/2. This is evidence of
loss reduction, **not** evidence of better generated answers or
generalization. The report now exposes these facts separately via
`feedback_loss_improved`, `observed_generalization_gain`, and
`release_evidence_sufficient=false`. The training pipeline's
`candidate_eligible_for_review` must not be interpreted as
independent proof of response quality.

## Expanded experiment

The expanded version uses 12 approved synthetic feedback records,
24 replay examples, two training epochs, and 20 held-out prompts
(10 per benchmark). It retains the same deterministic seed and reports
the full aggregate holdout counts. The 20 examples are templated synthetic
cases, not independently curated real-world writing tasks. Results
must be reviewed before claiming generalization.

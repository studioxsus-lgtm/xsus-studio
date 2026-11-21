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

## Expanded CI observation and quality gate

GitHub Actions run 44876518846 measured feedback loss
5.57560648 → 4.67939741, but **0/20 accepted holdout responses**
both before and after training. The experimental
`candidate_quality_gate_passed` therefore requires at least one
additional accepted holdout response and no benchmark-specific
acceptance regression. This gate is distinct from the existing
`candidate_eligible_for_review` loss-based flag, and neither flag
authorizes deployment. Future work should improve the training
objective, generation and independently curated holdout coverage.

## Generation diagnostics

The experiment now records privacy-safe aggregate generation diagnostics
for both baseline and candidate, per benchmark: empty responses,
normalized response diversity, most-common-response frequency,
mean response length, and accepted/exact scores. It deliberately does
not include raw generated strings, prompts or references in the public
diagnostics. This helps identify output collapse or empty generation
before changing neural architecture. These aggregate metrics do not
prove semantic quality.

## Diagnosed output collapse

GitHub Actions run 44877016090 showed 0 empty responses before
training in each ten-case benchmark, but **10/10 empty candidate
responses in each benchmark** after training. Baseline response
diversity was 10 and 9 respectively, while the candidate diversity
collapsed to 1 in each benchmark. The training loss improvement is
therefore not a successful language-generation improvement.

The experiment now emits `generation_collapse_detected` and
`candidate_safe_for_review`. An increase in empty responses or
a new all-identical-response collapse blocks the experimental quality
gate even when loss improves. This is a report-level gate; it does
not change the neural optimizer or claim to cure collapse. The
existing learning-cycle eligibility flag is reported separately.

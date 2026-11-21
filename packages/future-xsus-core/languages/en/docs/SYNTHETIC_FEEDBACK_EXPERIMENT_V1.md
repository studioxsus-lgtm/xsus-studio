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

## Experimental EOS ablation

The generator now supports an **opt-in** `min_new_tokens` argument,
defaulting to zero for full backward compatibility. During the first
N generated tokens, EOS cannot terminate generation; the external
stop signal and maximum token limit still take precedence. This is
an ablation, **not** a model fix: forcing non-empty output may create
meaningless repetitions.

The synthetic experiment measures an additional candidate arm with
`min_new_tokens=8`, alongside unchanged default generation. Both
arms are scored on the same 20 synthetic held-out cases and include
only aggregate diagnostics. The experimental arm cannot authorize
candidate promotion or deployment.

## Visible-character ablation

GitHub Actions run 44877376471 showed the eight-token minimum
still produced 20/20 empty responses and 0/20 accepted responses.
Token count alone does not guarantee visible output.

The generator now has a separate **opt-in** `min_visible_chars`
argument, defaulting to zero. It suppresses EOS until the decoded,
stripped text reaches the requested visible-character count, subject
to the existing maximum token limit and stop signal. The synthetic
experiment compares this additional arm on the same 20 held-out cases.
It does not change default generation, and cannot authorize release.
If the model generates only whitespace, the maximum-token cap may
still produce an empty answer; this experiment measures that possibility.

## Token-choice diagnostics

The 8-visible-character experiment in CI run 44877610361 also
returned 20/20 empty responses. To distinguish EOS preference,
whitespace generation and other non-visible tokens, the experiment
now inspects the candidate's first 32 greedy token selections on
each held-out case, **without** returning raw token IDs, prompts
or generated text. Aggregate categories include whitespace,
printable, non-rendering and control/replacement tokens. This
diagnostic deliberately continues greedy choices without stopping
on EOS; it measures model preference, not the deployed response.
No training, production defaults or promotion rules are changed.

## Visible-first decoder ablation

GitHub Actions run 44899163971 measured **640/640 whitespace
token selections** in the candidate across the 20 held-out prompts
(32 greedy steps each), with no EOS preference. This directly
explains why the generated responses are empty after stripping.

An **opt-in** `avoid_leading_whitespace=True` decoding mode now
restricts the first visible token choice to tokens that decode to
non-whitespace, when available. The default remains `False`.
The experiment scores this mode with `min_visible_chars=1`
alongside the existing baselines. This is an ablation and may
produce poor text; it does not fix the underlying training
distribution or authorize promotion.

## Training-target distribution audit

GitHub Actions run 44901375689 confirmed visible-first decoding
changes 20/20 empty responses to non-empty one-character outputs,
but **0/20 accepted**. This is a decoder workaround, not a quality gain.

The experiment now additionally counts EOS, whitespace, printable
and other target-token categories in the 24 synthetic replay
examples. This distinguishes a whitespace-heavy training target
distribution from a model that collapses onto whitespace despite
other target classes being present. Only aggregate counts are
reported. Training, release gates and default generation remain
unchanged.

## Output-bias attribution audit

Run 44901892959 confirmed 374 printable target tokens, 48 whitespace
target tokens and 24 EOS tokens across the 24 replay examples.
Whitespace is only 10.7623% of these targets, despite the candidate
choosing whitespace for all 640 diagnosed greedy steps.

The new output-bias audit compares the top generatable token category
in the model's output bias with the top token category for an empty
context, separately before and after training. This helps test whether
a learned global output bias may explain the collapse, versus a
context-dependent effect. The audit exposes neither token IDs nor
text, and does not alter training or deployment.

## Context attribution audit

CI run 44902091726 showed that the candidate's top output-bias
token was printable, while its empty-context logits favored
whitespace. The new diagnostic compares the top output-bias
token with the context-conditioned greedy winner on each held-out
prompt. It reports category switches, whitespace winners, and
winner-versus-bias logit margins without exposing text, token IDs
or hidden vectors. This is attribution evidence, not a proof of
causality or a training fix. Default model behavior is unchanged.

## Hidden-state contribution decomposition

Run 44902369472 measured a category switch from the candidate's
printable output-bias winner to whitespace for all 20 held-out prompts.
The new audit computes the output-weight × hidden-state contribution
to the winning token versus the output-bias winner. It records how
often this hidden contribution is positive and the mean contribution
margin. No raw prompts, token identifiers or hidden vectors are
included. This diagnostic separates learned output bias from
context-conditioned hidden activation; it does not change model
training or imply independent language proficiency.

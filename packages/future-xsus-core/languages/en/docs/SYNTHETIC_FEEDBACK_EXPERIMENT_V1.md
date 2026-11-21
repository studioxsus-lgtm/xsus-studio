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

## Hidden-contribution scaling ablation

Run 44903717326 found positive hidden-state logit advantages for
whitespace over the output-bias winner in all 20 held-out cases
(mean margins 0.964026 and 0.976139). To test the contribution
rather than speculate, generation now accepts an **opt-in**
`hidden_contribution_scale` between 0 and 1, defaulting to 1.
At 1 the original model logits are used unchanged. Lower scales
multiply only the hidden-state contribution to output logits,
without modifying checkpoint weights or training. The synthetic
experiment scores scales 0, 0.25, 0.5 and 0.75 on both held-out
groups. This ablation may increase visible output without
improving correctness and does not authorize deployment.

## Prompt sensitivity diagnostic

Run 44903949174 confirmed that setting hidden contribution to zero
produced 20 nonempty but repetitive 64-character responses, with
zero accepted answers; scales 0.25, 0.5 and 0.75 all returned empty
responses. No scaling arm improves correctness.

The next diagnostic compares the candidate's full output-logit
vectors across the ten different held-out prompts in each benchmark.
It reports the number of distinct greedy winners and aggregate
maximum logit changes relative to the first prompt, without
exposing prompt text, token identifiers or raw logit vectors.
This distinguishes weak input sensitivity from failures of
autoregressive decoding; it does not change training or production.

## First-token decision margin

Run 44904182052 found one greedy winner across all ten prompts
in each holdout group, even though logit vectors changed by up to
0.193031 and 0.191710. The new decision-margin audit records the
top-two generatable logit gap and whitespace-winner count on each
holdout prompt. These aggregate measures help determine whether
small input-driven changes can plausibly overcome the leading
token. No logits, tokens or prompt text are emitted. This is
diagnostic only; no change to model training or release policy.

## Held-out first-target ranking

Run 44904407427 confirmed that whitespace won the first-token
decision in all 20 held-out prompts, with average top-two logit
margins 0.179349 and 0.173900. The new diagnostic evaluates the
rank of each held-out reference answer's first encoded token under
the actual candidate model. It aggregates top-one accuracy,
mean rank and best-versus-reference logit gap, with no reference
text, token IDs or raw logits in the report. This is diagnostic
evidence for a potential training-objective mismatch, not
evidence of model correctness or production readiness.

## First-target weighted teacher forcing (isolated prototype)

Run 44904657705 showed that the reference first token was never
the model's top choice across 20 holdout cases. Its mean rank was
205.5 (written-v4) and 205.3 (written-v5). The isolated
`first_target_weighted_training_v1` function adds opt-in extra
teacher-forced SGD updates on the first answer token (integer
weight 1–8), preserving the original prefix until all repeated
updates complete. This is an experimental training primitive,
not a demonstrated fix: it is not wired into candidate promotion,
does not modify the standard trainer or production defaults,
and has no holdout improvement claim until a controlled ablation
is run. It must be compared against weight 1 on identical data,
seed, and held-out cases before consideration.

## Four-arm first-target training ablation

The experiment now trains four **independent in-memory copies**
of the same unmodified synthetic baseline, with first-target
weights 1, 2, 4 and 8. Each arm uses the same 24 synthetic curated
training examples, one pass, learning rate 0.008, and the same
20 held-out cases. Each arm reports first-reference-token rank
and full-generation acceptance/empty-output diagnostics.
No ablation arm saves a checkpoint, changes the normal
continual-learning trainer, promotes a candidate or deploys.
Weight 1 is the comparison control; improvement requires heldout
acceptance gains without regression, not merely a better token
rank or more visible text.

## Four-arm result and quality decision

GitHub Actions run 44905190014 passed. Weight 4 gave the best
first-reference-token mean ranks (149.1 written-v4, 145.0
written-v5), versus weight 1 (163.6, 160.1). Weight 8 regressed
on rank and reduced generated-response diversity. Crucially all
four arms scored **zero accepted answers out of 20**. The new
decision report compares acceptance, regressions, diversity and
first-token rank but explicitly does not recommend a release.
Improved rank is not a proxy for accepted generations.

## Teacher-forced answer-position audit

A new audit measures next-token top-one accuracy and best-to-target
logit gaps in three answer positions: first token, early tokens
(positions 2–4), and later tokens (position 5 onward). EOS is
excluded. It is computed for every weight arm and both synthetic
holdout groups without exposing reference text, token IDs or
raw logits. This separates first-token failures from failures
later in an otherwise correctly supplied reference prefix.
Teacher-forced accuracy is not free-running generation quality.
The standard training and release gates remain unchanged.

## Position regression safeguard

Run 44905709250 passed. Across both ten-case heldout groups,
weights 1 and 2 correctly predicted 40 of 580 later reference
tokens; weights 4 and 8 correctly predicted zero of 580. All
arms scored zero correct among the first 20 tokens and zero
among 60 early tokens. The new guard compares per-segment
correct-token counts against weight 1 on the exact same
holdout groups and explicitly flags position regressions for
weights 4 and 8. This is an additional diagnostic safeguard,
not an automatic release or an improvement claim.

## Position-balanced training ablation

An isolated four-arm experiment compares **uniform (1/1/1)**,
**first2 (2/1/1)**, **balanced2 (2/1/2)**, and **balanced3
(2/2/2)** first/early/later teacher-forcing weights. All arms
start from the same baseline, use the same 24 synthetic training
examples and 20 heldout cases, and report both generation
acceptance and teacher-forced token accuracy by position.
Any later-token regression or per-benchmark acceptance
regression is recorded; an improvement in first-token ranking
alone never proves quality. No experimental model is saved,
promoted, or deployed. Manual release remains mandatory.

## Prompt-target association contrast

GitHub Actions run 44906244190 passed. The position-balanced
arms all accepted 0/20 heldout responses. Uniform, first2
and balanced2 achieved 40/580 correct later reference tokens;
balanced3 achieved 0/580. A new prompt-target contrast diagnostic
now compares the logit of the correct first reference token
under its matched prompt against the same token under a
deterministically rotated alternative prompt. It reports
only aggregate preference rates, mean logit advantages,
and winner changes, across all four arms and both holdout
groups. This is a limited association probe, not proof
of reasoning, semantic understanding or production readiness.

## First-target contrast identifiability safeguard

Run 44906459966 passed, but the original rotated-prompt
contrast yielded zero mean target advantage in all arms.
Because the synthetic holdout reference answers begin with
the same first token, the cyclic difference telescopes to
zero regardless of model behavior. The new identifiability
audit reports first-target diversity, dominant target rate,
and explicitly marks the shared-target contrast as
**insufficient_target_diversity**. This prevents a structurally
uninformative zero from being interpreted as evidence for
or against semantic prompt conditioning. Future evaluations
must use independently authored, varied reference starts
before drawing conclusions about prompt-target association.

## Diverse-start heldout diagnostic

A separate, explicitly synthetic ten-case **diverse-target-v1**
holdout has ten distinct first response tokens. It is used
only for the four position-balanced experimental arms, not
for candidate approval, official benchmark claims, or
production release. The two existing written-v4/v5 groups
remain unchanged, and the new identifiability audit must
flag their shared first target as non-identifiable while
recognizing the diverse group as identifiable. The contrast
still cannot establish semantic understanding or generalization
without independent, realistic evaluation data.

## Context-window collision audit

Run 44907400983 passed. On the new ten-case diverse-target
holdout, all four balanced-training arms produced zero accepted
responses and zero correct matched-prompt first-target preferences.
The new **prompt-context-collisions.v1** diagnostic counts
distinct full prompts versus distinct final context windows
at the model's actual 16-token context limit. It is designed
to distinguish weak learned prompt conditioning from a more
basic issue: different questions may be truncated to identical
model-visible suffixes. The audit exposes aggregate counts
only and does not authorize a release.

## Context window sweep: isolate truncation from learning

Run 44908072310 passed and established that all ten diverse-target
questions collapse to **one** model-visible context at 16 tokens,
while written-v4 and written-v5 retain ten distinct contexts each.
A new read-only sweep evaluates 16, 32, 64, and 128-token
suffixes of the **same** formatted prompts. It reports distinct
contexts, collision counts, largest collision group, and the
smallest tested collision-free size. It does not alter model
weights or context settings. Distinguishable prompts at larger
windows would isolate truncation as one cause of the failed
prompt-target contrast, but would not establish that a larger
model actually learns or answers correctly.

# Wider-context ranking decision gate v1

Status: evaluation-only. No model weights, production settings, or release gates are changed.

## Verified baseline
- GitHub Actions run 44910675882 for commit 626f4dcc completed successfully.
- Prior measured ten-case counterfactual: matched first-token preferences were 0/10 at 16 tokens, 8/10 at 32 tokens, and 8/10 at 64 tokens.
- Correct top-one first tokens: 0/10 for all three windows. Greedy winner changes: 0/10 for all windows.
- Preference matching alone is not evidence of improved generation quality.

## Required comparison
Evaluate the *same frozen checkpoint*, exact prompt set, tokenizer, deterministic inference parameters, and target token IDs at 16, 32, and 64 visible context tokens. Preserve per-case inputs and hashes. Report:
1. Rank of the true first token (1 is best), per case and aggregate mean/median.
2. Best-logit minus true-token logit gap, per case and mean; lower is better.
3. True-token top-one accuracy and greedy winner change count.
4. Preference match count, explicitly separated from top-one accuracy.
5. Latency and memory cost for each context window.
6. Cases that regress, including truncated/ambiguous prompts and counterexamples.

## Decision rules
- **Do not train** a 32-token checkpoint merely because preference match increases.
- A 32-token training experiment may be proposed only if rank or gap improves consistently on held-out cases, without unacceptable regressions, and evidence is reproducible across repeated deterministic runs.
- A proposal is not authorization for training or deployment. Record a separate approval decision.
- If 64 tokens materially outperform 32, investigate visibility limits before fixing the training window.
- If neither rank nor gap improves meaningfully, retain the current checkpoint and investigate data quality, tokenization, target alignment, and evaluation design.
- Never label a passing CI run as a model-quality improvement by itself.

## Next evidence artifact
Produce a machine-readable per-case table with: case_id, prompt_hash, checkpoint_hash, context_window, target_token_id, target_rank, best_target_logit_gap, greedy_token_id, correct_top_one, preference_match, latency_ms. Include aggregate summaries and explicit limitations. No production rollout until independent holdout and regression gates pass.

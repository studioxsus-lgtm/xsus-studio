# Future XSUS Core — Phase 3 (in progress)

Phase 2 engineering acceptance was verified green at commit `bb32d8b9`
on branch `future-xsus-core`. That acceptance covers only bounded,
authored, controlled-English diagnostics, not open-domain comprehension.

## Phase 3.1 — Bounded action semantics

`action_semantics_v1.py` introduces a deterministic mapping for the
11 actions already recognized by the controlled sentence parser:

- `read`, `review` → `information_access`
- `check`, `test` → `verification`
- `write`, `create` → `content_creation`
- `build` → `construction`
- `open` → `access`
- `send` → `transfer`
- `update` → `modification`
- `delete` → `removal`

The classifier reuses the existing sentence parser, preserves explicit
polarity, and abstains on unsupported inputs. It does not infer intent,
truth, causation, entailment, temporal scope, or broad word meanings.

```bash
python -m unittest languages.en.tests.test_action_semantics_v1 -v
```

**Release status:** Phase 3 is experimental and not production authorized.
The next milestones are adversarial category evaluation, semantic contrast
tests, and a separate Phase 3 quality gate. Future XSUS Core remains
independent of Hyper XSUS Core, XSUS AI Core, and the main website.

## Phase 3.2 — Action relations and authored quality gate

The opt-in `action_relations_v1.py` compares category, explicit action and
polarity for two controlled English sentences. It reports one of five
bounded relations, or abstains if either sentence cannot be parsed. It does
**not** infer logical entailment, identity of events, truth or causation.

The `action_semantics_holdout_v1.jsonl` contains 32 development-authored
examples (22 expected categories and 10 expected abstentions). The
`action_semantics_benchmark_v1.py` returns only aggregate counts and
rejects malformed or duplicate identifiers. The separate
`action_semantics_quality_gate_v1.py` fails closed on wrong categories,
missed supported examples, false resolutions, insufficient coverage, and
invalid count integrity. CI runs all new regression tests and publishes
aggregate benchmark and gate reports.

```bash
python -m unittest languages.en.tests.test_action_relations_v1 languages.en.tests.test_action_semantics_benchmark_v1 languages.en.tests.test_action_semantics_quality_gate_v1 -v
python -m languages.en.evaluation.action_semantics_quality_gate_v1
```

This authored holdout is **not independent or blind**. The Phase 3 milestone
is in progress, not a production release.

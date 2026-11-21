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

## Phase 3.3 — Explicit grammatical roles

`role_semantics_v1.py` classifies a successfully parsed subject as
first-person, second-person, third-person pronoun, or explicit nominal,
and its object as definite or indefinite. This is a surface grammatical
classification, not an inference about the identity or agency of a real
person or system.

`role_relations_v1.py` compares explicit subject/action/object/polarity
fields and conservatively abstains when either frame is unsupported.
Matching fields do not prove that two sentences describe the same event,
and opposite polarity does not prove a real-world contradiction.

An 18-case authored diagnostic (12 single frames, six sentence pairs) and
unit tests are integrated into the GitHub benchmark workflow. No external
blind benchmark or production authorization is claimed.

```bash
python -m unittest languages.en.tests.test_role_semantics_v1 languages.en.tests.test_role_relations_v1 languages.en.tests.test_role_semantics_benchmark_v1 -v
python -m languages.en.evaluation.role_semantics_benchmark_v1
```

## Phase 3.4 — Bounded batch role analysis

`role_batch_v1.py` processes up to 32 sentences and at most 64 explicitly
requested sentence pairs, with a total input budget of 8192 characters
and a 1000-character limit per sentence. It returns structured role
results and abstentions, without echoing unsupported raw sentences.

`role_evidence_v1.py` groups independently parsed sentences by exact
normalized subject/action/object fields and records positive/negative
indices. This grouping does not establish event identity, coreference,
logical contradiction, or real-world truth. `role_batch_benchmark_v1.py`
performs an authored 11-check aggregate diagnostic. CI runs new tests
and publishes only aggregate diagnostics.

```bash
python -m unittest languages.en.tests.test_role_batch_v1 languages.en.tests.test_role_evidence_v1 languages.en.tests.test_role_batch_benchmark_v1 -v
python -m languages.en.evaluation.role_batch_benchmark_v1
```

## Phase 3.5 — 1000-sentence bounded throughput

`role_bulk_v1.py` processes **up to 1000 controlled-English sentence
inputs per invocation**, internally chunked to respect the existing
32-sentence and 8192-character batch limits. It preserves absolute input
indices, explicit abstentions and result ordering. The bulk input budget
is 256000 characters. `role_bulk_benchmark_v1.py` validates 1000
programmatically generated inputs (750 supported, 250 intentionally
unsupported) with ten aggregate checks. Regression tests cover ordering,
large input rejection and mixed supported/unsupported sentences.

This measures **1000 sentence inputs**, not 1000 distinct grammatical
constructions, new vocabulary entries, or open-domain language ability.
All supported examples remain constrained by the existing grammar.

```bash
python -m unittest languages.en.tests.test_role_bulk_v1 languages.en.tests.test_role_bulk_benchmark_v1 -v
python -m languages.en.evaluation.role_bulk_benchmark_v1
```

## Phase 3.6 — Expanded controlled English lexicon

An opt-in, independent grammar module `expanded_english_v1.py` adds
40 verb lemmas, 50 explicit noun heads and 15 explicit subjects. These
support 30,000 positive subject–verb–object lexical combinations before
considering negation, subject agreement and determiners. The diagnostic
`expanded_english_benchmark_v1.py` checks **1000 distinct generated
subject–verb–object combinations**, rather than repeating a small set of
sentences. All cases are authored/generated in-project; this is not an
independent external blind evaluation. This grammar does not replace the
existing Phase 2 parser or claim open-domain English comprehension.

```bash
python -m unittest languages.en.tests.test_expanded_english_v1 languages.en.tests.test_expanded_english_benchmark_v1 -v
python -m languages.en.evaluation.expanded_english_benchmark_v1
```

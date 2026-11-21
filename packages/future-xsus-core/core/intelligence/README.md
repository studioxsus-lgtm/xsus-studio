# Central Intelligence Kernel — Phase 4.0 (experimental)

This module is the first compositional layer for Future XSUS Core. It does not
replace the independent English model, grammar analyzers, routing, sessions or
HTTP service. The English adapter composes existing opt-in analyzers and
returns explicit abstention on unsupported sentences.

Capabilities and boundaries:

- **Language:** classify a subset of controlled English structures through
  existing grammar parsers; no free-form general understanding.
- **Knowledge:** accepts only an injected retrieval adapter with a nonempty
  source identifier. Source presence is NOT factual verification.
- **Planning:** records up to eight explicit steps without executing them.
- **Execution:** denied until a separate trusted permission system exists.
- **Learning:** deterministic review proposal IDs only; no silent training,
  code mutation, checkpoint changes or automatic knowledge commits.
- **Conversation:** volatile bounded local history (16 turns); persistent
  multi-user sessions continue to use the existing sessions infrastructure.

Example (from the package root):

```python
from core.intelligence.english_adapter_v1 import create_english_kernel
kernel = create_english_kernel()
print(kernel.analyze("She has reviewed the report."))
```

Verification:

```bash
python -m unittest tests.integration.test_intelligence_kernel_v1 -v
python -m unittest discover -s tests/integration -v
```

The integration suite verifies language composition, safe abstention,
knowledge provenance boundary, explicit planning, denied execution, gated
learning and bounded dialogue. It is not an independent benchmark of
reasoning, autonomous learning or production readiness.

**Next acceptance gates:** integrate a source-verifying knowledge store,
reasoning over formal test cases, persistent owner-scoped conversation
integration, permissioned tool execution, independent holdout evaluation
and controlled learning promotion. No production authorization is implied.

## Phase 4.1 — Formal reasoning and proof verification

`reasoning_v1.py` implements bounded propositional Horn-rule forward chaining
with deterministic proof provenance and independent proof replay. The central
kernel now exposes `reason(query, facts, rules)` and returns a verified result
only when the formal derivation can be replayed against the original facts and
rules. Missing premises abstain. This is **not** unrestricted reasoning,
independent factual verification, contradiction handling, or AGI.

```bash
python -m unittest tests.integration.test_reasoning_v1 tests.integration.test_intelligence_kernel_v1 -v
```

## Phase 4.2 — Evidence-aware knowledge and inference

`knowledge_v1.py` stores bounded immutable owner-scoped records, SHA-256
excerpt integrity and explicit source IDs. Conflicting values block answers;
missing or cross-owner evidence abstains. `knowledge_reasoning_v1.py` uses
explicit true propositions to construct replay-verified formal derivations.
The central kernel exposes `infer_from_sources`.

Integrity of a supplied excerpt does **not** establish source authenticity or
truth. Owner IDs are logical partitions, not authentication. A trusted API must
authenticate callers before selecting owner IDs. Knowledge is currently
in-memory, not a durable database, and there is no autonomous retrieval.

```bash
python -m unittest tests.integration.test_knowledge_reasoning_v1 tests.integration.test_intelligence_kernel_v1 -v
```

## Phase 4.3 — Session memory and review-gated learning

`memory_learning_v1.py` reads the **existing** owner-scoped session store
(in-memory or compatible SQLite implementation) and produces bounded context
without changing conversation history. A correction to the latest assistant
answer becomes a proposal in `learning_v1.py`, using an expected session
revision. Proposals are deduplicated and owner-scoped. Reviewers may reject
or approve **for evaluation only** with revision checks.

This implementation does not train a model, promote checkpoints, persist the
proposal ledger across process restarts, authenticate reviewers, or verify that
a proposed correction is true. A trusted application must authenticate owners
and reviewers. No automatic learning is enabled.

```bash
python -m unittest tests.integration.test_memory_learning_v1 -v
```

## Phase 4.4 — Bounded intelligent problem solver

`problem_solver_v1.py` composes formal multi-step inference into an auditable
solution. Each step has explicit premises and rule provenance, with independent
replay verification and configurable step budgets. `IntelligenceKernel.solve_problem`
exposes this capability. Missing evidence abstains, altered proofs fail, and
no plan can execute external tools. This is **not** an open-domain planner or
autonomous problem solver.

```bash
python -m unittest tests.integration.test_problem_solver_v1 tests.integration.test_intelligence_kernel_v1 -v
```

## Phase 4.5 — Dependency-aware task planning

`task_planner_v1.py` accepts up to 128 bounded tasks, each with explicit
dependencies. It rejects missing dependencies and duplicate IDs, detects
cycles, produces deterministic topological ordering, validates completed tasks
against prerequisites, and independently verifies an unchanged plan.
`IntelligenceKernel.plan_tasks` returns a proposed plan, never an executed one.

```bash
python -m unittest tests.integration.test_task_planner_v1 tests.integration.test_intelligence_kernel_v1 -v
```

The engine does not discover goals automatically, operate external tools, or
assert that tasks were completed in the real world. Caller-provided completion
claims require separate trusted evidence and authorization.

## Phase 4.6 — Auditable multi-criteria decision support

`decision_v1.py` ranks bounded alternatives against weighted criteria and
mandatory minimums. Invalid or incomplete scores fail closed, ineligible
options are excluded before ranking, ties resolve deterministically, and
`verify` independently recomputes the entire decision. The central kernel
exposes `decide(criteria, options)` and returns only a **proposed** choice.

The caller supplies all scores and constraints; they are not independently
verified facts. No option is executed and no external systems are modified.

```bash
python -m unittest tests.integration.test_decision_v1 tests.integration.test_intelligence_kernel_v1 -v
```

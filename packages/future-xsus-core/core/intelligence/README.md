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

## Phase 4.7 — Unified intelligence pipeline

`unified_pipeline_v1.py` dispatches an explicit allowlist of five supported
operations: formal reasoning, bounded problem solving, dependency planning,
decision support, and source-scoped formal inference. Requests and batches
are bounded, request IDs must be unique, and unknown operations or unexpected
payload keys are rejected. Responses share a consistent contract containing
status, evidence, steps, verification state and limitations.

The pipeline does not execute tools, train models, retrieve from the web,
authenticate users, or independently verify source truth. This is a bounded
integration API, not a general autonomous agent.

```bash
python -m unittest tests.integration.test_unified_pipeline_v1 -v
```

## Phase 4.8 — Reliability evaluation and regression gates

`evaluation_v1.py` runs bounded authored cases through the unified pipeline,
checks expected status, answer, and verification state, and reports per-case
mismatches. Regression comparison flags previously passing cases that fail
under the same case IDs and rejects changed case sets.

```bash
python -m unittest tests.integration.test_evaluation_v1 tests.integration.test_unified_pipeline_v1 -v
```

The evaluator is an offline correctness gate only: it does not measure
production load, prove real-world factual accuracy, or assess general
intelligence. Benchmarks must be independently reviewed to avoid overfitting.

## Phase 4.9 — Bounded resilience and repeatability

`resilience_v1.py` executes up to 64 requests over up to 100 sequential
rounds, fingerprints response contracts, detects nondeterministic results,
and isolates request failures so later requests still run. Exceptions are
reported by class only; message contents are not included in reports.

```bash
python -m unittest tests.integration.test_resilience_v1 -v
```

This is a sequential in-process regression stress harness. It is not a
concurrent load benchmark, fault-injection suite, service availability
measurement, or crash-recovery guarantee.

## Phase 5.0 — Consolidated readiness gate

`readiness_v1.py` runs cross-engine authored fixtures through the evaluator,
then repeats those requests through the resilience harness. It checks full
fixture pass, repeatability, execution counts, no failures and no detected
nondeterminism. An unmet check fails the gate. Integration tests inject
failures into evaluator and resilience paths to verify fail-closed behavior.

```bash
python -m unittest tests.integration.test_readiness_v1 -v
```

A passing gate means only that the bounded fixtures and sequential repeatability
checks passed. It does **not** certify production readiness, general intelligence,
independent fact verification, autonomous learning, or crash recovery.

## Phase 5.1 — Adaptive feedback (review-gated)

`feedback_v1.py` converts explicitly corrected failed evaluation cases into
owner-scoped, idempotent pending learning proposals in the existing ledger.
Only failed cases may receive corrections; mismatched reports are rejected.
Review requires a revision check and produces `approved_for_evaluation`,
never automatic deployment, training, or trusted knowledge updates.

```bash
python -m unittest tests.integration.test_feedback_v1 -v
```

Corrections come from a caller and require independent review. The ledger is
in-memory, not authenticated or durable; do not treat this as autonomous
learning or production-grade governance.

## Phase 5.2 — Controlled improvement validation

`improvement_v1.py` compares a trusted caller-supplied candidate pipeline
against a baseline using the same authored cases. Validation requires an
owner-scoped proposal with `approved_for_evaluation` status. Previously
passing cases that fail block the candidate, while at least one newly passing
case and zero regressions yield `eligible_for_manual_review`.

```bash
python -m unittest tests.integration.test_improvement_v1 -v
```

No candidate is deployed or promoted by this module. Review approval is
not deployment authorization. Benchmarks are bounded, authored fixtures;
additional security, independent validation and operational testing are
required before any production use.

## Phase 5.3 — Candidate governance and version review

`governance_v1.py` records owner-scoped candidate IDs tied to eligible
improvement verdicts. Manual review requires expected revision and transitions
pending candidates to `approved_for_release_review` or `rejected`.
Candidate IDs cannot be rebound to different proposals; repeat reviews fail.

```bash
python -m unittest tests.integration.test_governance_v1 -v
```

The in-memory registry is not an authenticated durable audit log. Approval
only allows further release review; it never deploys, trains or promotes
candidate code automatically.

## Phase 5.4 — Persistent governance snapshots

`persistent_governance_v1.py` stores bounded candidate governance records
in a versioned, SHA-256-checksummed JSON snapshot. It writes to a temporary
file, fsyncs, atomically replaces the destination and syncs the containing
directory where supported. Reload validates checksum, record shape, revision
and status, rejecting corrupt or truncated snapshots without replacing the
current in-memory registry.

```bash
python -m unittest tests.integration.test_persistent_governance_v1 -v
```

Use with a single process and exclusive ownership of the snapshot path.
Checksums detect accidental changes but are not authentication or protection
against malicious rewriting. This does not provide multi-process locking,
transactional audit history, encrypted storage or disaster recovery.

## Phase 5.5 — Audit integrity, initial safeguards

`audit_v1.py` appends fsynced JSONL decision events with sequential SHA-256
hash chaining. On startup and before each append it verifies the entire
journal, rejecting corruption and stale writer instances. It does not provide
an interprocess atomic lock; two truly concurrent processes may still race
between verification and append. Accordingly, run with a single exclusive
writer only until a dedicated lock protocol is implemented and tested.

```bash
python -m unittest tests.integration.test_audit_v1 -v
```

The audit chain is not authenticated, encrypted or tamper-proof against
malicious writers. This phase adds integrity detection but **does not yet
certify multi-process concurrency safety**.

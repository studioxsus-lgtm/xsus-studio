# Future XSUS Core — Phase 7.0 architecture audit

Status: initial repository-based audit; not a security certification or production authorization.
Scope: `packages/future-xsus-core/` on branch `future-xsus-core`.
Baseline: GitHub Actions successful for commit `705503e8` (Phase 6.6).

## Verified repository inventory

| Area | Implemented files / contracts | Audit conclusion |
| --- | --- | --- |
| Language | `languages/en/`, `core/intelligence/english_adapter_v1.py` | English-specific engine and bounded adapter exist; do not infer open-domain comprehension. |
| Other languages | `languages/sq/`, `languages/fr/` | Scaffold/coverage must be checked before claiming production support. |
| Contracts and routing | `core/contracts/`, `core/registry/`, `core/routing/` | Existing engine contracts, registry and request routing; preserve compatibility. |
| Execution | `core/execution/`, `services/engine-worker/`, `services/api/` | Local/HTTP execution infrastructure exists; the experimental intelligence kernel itself denies arbitrary tool execution. |
| Sessions | `core/sessions/session_store.py`, `sqlite_store.py` | In-memory and SQLite session implementations; owner IDs must come from authenticated callers. |
| Intelligence | `core/intelligence/` | Formal Horn reasoning, evidence-aware local knowledge, learning proposals, planning, decision, evaluation and crash-recovery harnesses exist. |
| Conversation | `core/intelligence/conversation_router_v1.py` | Explicit commands only (`prove <atom>`, `history`); not a free-form dialogue engine. |
| Knowledge learning | `knowledge_learning_v1.py` | Human review of conflicting local records; no automatic truth verification or knowledge promotion. |
| Evaluation | `problem_evaluation_v1.py` | Authored offline cases; no autonomous real-world problem completion. |

## Confirmed boundaries and risks

1. **Identity and authorization (high):** owner-scoped data structures do not authenticate callers. Require trusted identity binding at service boundaries; separately authenticate reviewers.
2. **Knowledge provenance (high):** excerpt SHA-256 checks integrity of supplied text, not source authenticity or factual truth. Conflicting sources are flagged, not resolved.
3. **Learning promotion (high):** proposals can be approved *for evaluation*, but there is no verified automatic training or trusted promotion pipeline.
4. **Conversational capability (high):** the new router recognizes a narrow explicit command grammar. Do not advertise general language understanding.
5. **Persistence (medium):** SQLite session persistence exists, but the local `KnowledgeStore` and `LearningLedger` are process-local; their durability and migration strategy remain separate work.
6. **Evaluation coverage (medium):** authored symbolic tests and passing CI establish regression behavior only. Independent holdout data, security testing, concurrent production load and realistic user journeys require additional evidence.
7. **Integration (medium):** repository contains HTTP services and browser client; this audit does not establish a verified end-to-end XSUS App → Future XSUS Core deployment.
8. **Operational readiness (medium):** the presence of recovery tests does not by itself prove production disaster recovery, observability or operational SLOs.

## Phase 7 execution gates

- **7.1:** Introduce a versioned, opt-in natural-language intent interface; keep abstention for ambiguity and regression tests for existing grammar.
- **7.2:** Design owner-scoped durable evidence records with authenticated provenance and conflict-resolution workflow.
- **7.3:** Define an independently evaluated learning candidate lifecycle with manual promotion and rollback.
- **7.4:** Add cross-engine benchmark scenarios with independently authored holdouts and explicit limits.
- **7.5:** Test authorization, abuse boundaries, concurrent recovery, and service failure modes.
- **7.6:** Verify XSUS App adapter contract end-to-end without coupling independent cores.
- **7.7:** Perform deployment, monitoring, load and rollback readiness checks before any production claim.

## Acceptance criteria for closing this audit

- Inventory and documented boundaries are traceable to repository paths.
- Each high-risk gap has an explicit acceptance gate and remains open until evidenced.
- No changes to `main`, no implicit integration with Hyper XSUS Core, no new autonomous execution permission.
- CI remains green after adding this documentation.

## Evidence and limitations

Reviewed repository tree and these source documents: package README, intelligence README, execution README, sessions README, `kernel_v1.py`, `knowledge_v1.py`, `learning_v1.py`, `session_store.py`, `problem_solver_v1.py`, and `task_planner_v1.py`. This is a **targeted initial audit**, not a line-by-line audit of every repository file. Any capability not directly verified remains unconfirmed.

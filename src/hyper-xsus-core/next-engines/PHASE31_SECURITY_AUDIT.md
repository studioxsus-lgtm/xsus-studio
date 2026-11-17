# Hyper XSUS Core — Phase 31 architecture and safety audit

Scope: six next-engines, orchestration, review-only control plane and recovery. This is a **source-code review**, not a penetration test, production certification or proof that the complete CI suite passed.

## Observed engine boundaries

| Engine | Observed implemented capability | Explicit limitation |
| --- | --- | --- |
| Truth Verification | Counts supplied evidence stances and detects duplicate evidence IDs | Does not independently verify truth |
| Learning | Normalizes candidate content and evaluates source-reference metadata | Does not train a model, verify sources or commit knowledge |
| Strategic Planning | Validates a draft dependency graph and calculates a topological order | Does not execute the plan |
| Autonomous Execution | Evaluates caller-supplied readiness flags | Always blocked; flags are not trusted authorization |
| Self-Improvement | Compares supplied benchmark values and produces deltas | Does not independently benchmark or apply changes |
| Multi-Agent | Plans proposed assignments using supplied agents and tasks | Does not dispatch agents or authorize delegation |

## Confirmed code-level boundaries

- Orchestration returns `authorizedForExecution:false` and `sideEffects:false`; individual stage contract errors are represented as rejected stages.
- Trust boundary performs a defensive copy with depth, node and byte limits, rejecting accessors and prototype-pollution keys; this protects only entry points that actually invoke it.
- Control plane composes trust isolation, circuit breaker, deadline, resource admission, review journal persistence and health snapshots.
- Persistent journal uses an exclusive file lock, atomic writer and SHA-256 digest; a digest is an integrity check, **not authentication** against an adversary able to rewrite both payload and digest.
- Deadline/cancellation may settle the caller-facing promise while a write remains in progress; reconciliation is required before deciding what happened.
- Readiness assessment always reports `productionReady:false` and `nextAction:"manual_review"`.

## Open risks / next engineering work

1. **Circuit-breaker classification:** the current breaker counts any rejection, including invalid input, cancellation, capacity rejection and timeout, as a failure. These are not necessarily storage or engine faults. Introduce explicit failure classification and tests.
2. **Concurrent circuit transitions:** stale completions of operations admitted before a circuit opens can change counters or state; test generation-safe transitions under overlapping requests.
3. **Trust-boundary entry-point coverage:** direct imports of individual engines and orchestration can bypass the control plane. Document or enforce the required public entry point.
4. **Persistent journal threat model:** SHA-256 does not authenticate the writer; consider trusted storage controls, key-backed integrity if required, and explicit permissions.
5. **Timeout semantics:** cancellation does not guarantee stopping a running write; avoid automated retries without authoritative reconciliation.
6. **Resource exhaustion:** copying/serializing an oversized untrusted object consumes memory before its byte limit is checked. Consider a streaming or budgeted traversal.
7. **Verification evidence:** run the full CI matrix, mutation/fuzz tests, cross-process recovery and security review before production claims.

## Gate

**Current outcome: NOT PRODUCTION CERTIFIED.** The subsystem remains review-only. Passing local/unit tests does not demonstrate autonomous learning, verified truth, safe execution, or production readiness.

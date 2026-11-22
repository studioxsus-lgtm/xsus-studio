# XSUS App Build Engine

Independent app-generation engine. Development branch: `feature/xsus-app-build-engine`.

## Architecture
XSUS App -> controlled API adapter -> Build Engine Orchestrator -> specialized engines.
Hyper XSUS Core (reasoning/planning) and Future XSUS Core (language) are optional injected adapters; neither is imported directly.

## Phase 1 / Phase 2 foundation
- Pure request validation and immutable job creation
- Dependency-injected planning orchestrator
- No side effects, filesystem writes, deployments or arbitrary code execution
- Job IDs supplied by the trusted caller; no secrets or credentials persisted
- The planner is a contract boundary, not yet a code generator

## Next gates
Define versioned adapter contracts, state transitions, project isolation, persistence and deterministic test harness. No generated code should execute before sandbox/security verification. Production readiness is not claimed.

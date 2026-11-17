# Hyper XSUS Core — six independent engine foundations

Scope: isolated `src/hyper-xsus-core/next-engines/` modules in the existing `feature/xsus-ai-core` branch. No modification of existing engine implementations, core entry point, main, or production adapters.

**This is an initial contract-safe foundation, not six finished autonomous engines.** The six modules deliberately fail closed:
- Truth: insufficient evidence until independently verified.
- Learning: proposal only; never writes knowledge.
- Planning: non-executable draft.
- Execution: blocked until sandbox, permissions and recovery exist.
- Self-improvement: analysis placeholder; never changes code.
- Multi-agent: blocked until delegation and identity policies exist.

Future milestones: provenance and contradiction analysis; transactional learning with revision checks and rollback; DAG planning; approved idempotent execution with crash recovery; benchmarked sandbox proposals; agent lifecycle and secure delegation. Each requires dedicated unit, integration, security, stress and recovery tests before enabling.

Tests: `npx vitest run tests/unit/hyper-next-six-engines.test.js`. No tests were claimed to pass merely by committing this scaffold.

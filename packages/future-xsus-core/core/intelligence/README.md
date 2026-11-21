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

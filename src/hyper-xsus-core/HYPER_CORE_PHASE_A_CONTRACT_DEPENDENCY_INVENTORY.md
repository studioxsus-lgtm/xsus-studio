# Hyper XSUS Core — Phase A: Contract and Dependency Inventory
Date: 2026-11-14
Branch: `feature/xsus-ai-core`
Status: targeted source inventory; **not** a complete dependency-graph audit or CI certification.

## Sources inspected
- `src/index.js` (XSUS AI public entry)
- `src/core/ai-core.js`, `src/core/context-engine.js`, `src/core/knowledge-retrieval-router.js`
- `src/knowledge/knowledge-service.js`
- `src/runtime/model-orchestrator.js`
- `src/hyper-xsus-core/index.js`, `ARCHITECTURE.md`
- `src/hyper-xsus-core/knowledge-linking/index.js` and `adapters/xsus-ai-knowledge.adapter.js`
- `src/hyper-xsus-core/knowledge-graph/index.js`, `public/knowledge-graph.api.js`
- Folder inventories of `src/core`, `src/knowledge`, `src/language`, `src/runtime`, Hyper Knowledge Graph and Linking.

## Public contract ownership

| Boundary | Existing contract / entry | Ownership and constraint |
| --- | --- | --- |
| XSUS AI Core | `src/index.js`, `src/core/ai-core.js` | Owns AI requests, conversation/memory, response generation; preserve API |
| AI request context | `src/core/context-engine.js`, `request-context.js` | Existing conversation/request context; **do not duplicate** in Hyper |
| AI retrieval router | `src/core/knowledge-retrieval-router.js` | Chooses Hyper adapter first, fallback to AI knowledge service |
| AI knowledge fallback | `src/knowledge/knowledge-service.js` | Existing source registration/search; do not move into Hyper |
| AI model runtime | `src/runtime/model-orchestrator.js` | Model selection/generation, explicitly not a model itself |
| Hyper Knowledge Linking | `src/hyper-xsus-core/knowledge-linking/index.js` | Owns link model, validator, schema, resolver, engine and API |
| Hyper Knowledge Graph | `src/hyper-xsus-core/knowledge-graph/index.js` | Owns graph model, validator, algorithms, engine and API |
| Hyper-to-AI adapter | `knowledge-linking/adapters/xsus-ai-knowledge.adapter.js` | Controlled adapter, text matching; explicitly **no embeddings/semantic search** |
| Hyper public entry | `src/hyper-xsus-core/index.js` | Exposes Link, Graph and adapter, not future reasoning/context services |

## Dependency directions observed in source
- `src/core/ai-core.js` imports request context, memory, language, response and retrieval-router modules, plus the AI knowledge fallback.
- `createKnowledgeRetrievalRouter({hyperAdapter, fallbackSearch})` accepts a Hyper adapter by injection and falls back to `searchKnowledge` when Hyper has no results or fails.
- `src/hyper-xsus-core/index.js` re-exports Knowledge Linking, Knowledge Graph and the XSUS AI Knowledge Adapter.
- Hyper adapter imports Link API and Graph API; it owns the adapter lifecycle and returns retrieval results for the AI boundary.
- Graph public API wraps the graph engine, exposing add/find/traverse/path/integrity operations.
- Model Orchestrator manages registry/selector/runtime; its source explicitly states it is not an AI model.

## Verified overlap and gaps
1. **Context terminology collision**: AI Core already implements conversational/request context. Hyper's future Knowledge Context must instead describe evidence/reference context, with its own versioned contract and no ownership of chat sessions.
2. **Retrieval already exists**: do not build a second generic retrieval router. Reuse the Hyper Link/Graph public APIs and adapter contracts.
3. **Reasoning remains separate**: traversal, path search and text matching are not provenance-aware inference. Build deterministic evidence-based reasoning only after defining its contract.
4. **Dedicated empty directories observed**: `knowledge-context`, `knowledge-reasoning`, `knowledge-orchestration`, `knowledge-analytics`, `execution-scheduling` contained only `.gitkeep` at audit time. This does not prove similar functionality is absent elsewhere.
5. **Durability limitation**: coordinated recovery is not cross-file atomic; SIGKILL tests are not power-loss proof.

## Proposed Knowledge Context v0.1.0 contract (design only, NOT implemented)
- Input: explicit query, bounded evidence references obtained through an injected read-only provider, language and limits.
- Output: immutable `{version,query,language,evidence:[{id,sourceType,sourceId,content,provenance}],truncated}`.
- Constraints: deterministic ordering, no hidden graph writes, no duplicate conversation history, reject invalid IDs, reject missing provenance, bounded content/number of references, do not expose private records without authorization.
- Dependency direction: Hyper Knowledge Context -> injected Link/Graph read-only interfaces; AI Core may consume via adapter, never import Hyper internal engine modules.
- Tests: invalid input, duplicates, deterministic ranking, provenance, immutability, zero evidence, limits, read-only behavior, failure isolation.

## Gates before implementation
1. Capture baseline CI logs and import/export map for all relevant modules.
2. Verify compatibility with existing Hyper adapter and AI router.
3. Approve Knowledge Context contract, then implement with focused unit/integration tests.
4. Confirm independent lifecycle and no cross-core direct import.
5. Verify complete CI before declaring a milestone.

## Non-goals
No edits to `main`; no migration of AI Core; no new model; no automatic graph repair; no claim of completed Knowledge Graph.

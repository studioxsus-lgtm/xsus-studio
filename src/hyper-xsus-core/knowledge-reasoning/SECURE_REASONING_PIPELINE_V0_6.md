# Hyper XSUS Core — Secure Reasoning Pipeline v0.6.0

## Scope
Read-only orchestration: authorized Knowledge Context -> explicit claim analysis ->
inference conflict review -> lineage explanation -> conservative decision.
No graph writes, no NLP claim extraction, no automatic action authorization.
This module is intentionally NOT exported from the Hyper Core root entrypoint.

## Trust boundary
1. Inject `createKnowledgeContextEngine({provider:createSecureGraphEvidenceProvider({graph,authorize})})`.
   The `authorize` callback MUST consult trusted server-side policy.
   Do NOT inject the legacy unscoped `createGraphEvidenceProvider`.
2. `resolveClaims` MUST be trusted server code. It receives only scoped evidence.
   User-supplied claims cannot be treated as verified facts merely because IDs match.
3. The pipeline checks principal and scope shape, but authentication and
   authorization are external trusted dependencies. Do not expose this
   constructor as a public API without a server-side security review.
4. `eligible` means structurally eligible for further review, not factual truth,
   policy approval, or permission to execute an action.
5. Explicit conflicts and truncated graph exploration yield no decisions.
   Truncated evidence context is rejected.

## Tests
`npx vitest run src/hyper-xsus-core/knowledge-reasoning/tests/secure-reasoning.pipeline.test.js`
Then run the full repository test suite to catch regressions.

## Limitations
The rule system supports only explicitly allowlisted transitive predicates.
Evidence counts are distinct identifiers, not statistically independent sources.
No claim semantic verification, policy-bound provenance attestation, or
cross-module production integration is claimed in this milestone.

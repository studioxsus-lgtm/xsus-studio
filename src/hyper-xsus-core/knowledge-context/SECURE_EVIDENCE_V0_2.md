# Hyper Knowledge Context — Secure Evidence v0.2.0

The v0.2.0 secure provider is opt-in and preserves the v0.1.0 engine API.

```js
import {createKnowledgeContextEngine} from "./knowledge-context.engine.js";
import {createSecureGraphEvidenceProvider} from "./secure-graph-evidence.provider.js";

const provider=createSecureGraphEvidenceProvider({
 graph:graphPublicApi,
 authorize:async ({principalId,scope}) => trustedPolicy.canRead(principalId,scope)
});
const context=createKnowledgeContextEngine({provider});
const snapshot=await context.build({
 query:"Alpha",authorization:{principalId:"user-123",scope:"team-a"}
});
```

Security properties:
- A trusted authorization callback must approve the principal/scope **before** graph access.
- Nodes must have `metadata.accessScope` matching the approved scope; missing scopes are denied.
- No data from another scope or unscoped nodes are returned.
- Errors from the authorization provider fail closed; no fallback to unverified evidence.
- This provider is read-only; it does not modify graph or link storage.

Important limitations:
- The legacy `createGraphEvidenceProvider` from v0.1.0 is **not** safe for private evidence. Use the secure provider for scoped/private data.
- The authorization callback must be implemented by trusted server-side policy; client-supplied principal IDs or scopes are not credentials.
- The secure provider uses node labels only; it does not authorize or return link evidence, metadata content, or semantic search.
- Graph API snapshots are loaded in memory and then filtered. This is not an authorization boundary against an already-compromised server process.
- No changes to XSUS AI Core, `main`, or existing public exports.

Status: source and tests committed; CI execution and security review pending.

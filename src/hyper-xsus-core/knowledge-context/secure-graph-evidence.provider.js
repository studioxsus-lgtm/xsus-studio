/**
 * Hyper XSUS Core — Scope-Verified Graph Evidence Provider v0.2.0.
 * Security boundary: explicit trusted authorization decision + per-node scope.
 * Never expose an unscoped graph as implicitly public.
 */
export const SECURE_GRAPH_EVIDENCE_VERSION = "0.2.0";
const plain = x => x !== null && typeof x === "object" && !Array.isArray(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const id = x => typeof x === "string" && x.length > 0 && x.length <= 200 && x.trim() === x;
const denied = () => Object.assign(new Error("Evidence access denied."),{code:"XSUS_EVIDENCE_ACCESS_DENIED"});
/**
 * authorize({principalId,scope}) must consult trusted server-side policy.
 * A request-supplied scope alone is never an authorization decision.
 * graph.getGraph() must return a trusted graph snapshot.
 */
export function createSecureGraphEvidenceProvider({graph,authorize}={}){
 if(!graph||typeof graph.getGraph!=="function"||typeof authorize!=="function")
  throw new TypeError("Graph API and trusted authorize callback are required.");
 return Object.freeze({
  async getEvidence({query,authorization,limit}={}){
   if(!plain(authorization)||!id(authorization.principalId)||!id(authorization.scope))
    throw denied();
   if(typeof query!=="string"||!query.trim()||query.length>8000)
    throw new TypeError("Invalid evidence query.");
   if(!Number.isSafeInteger(limit)||limit<1||limit>101)
    throw new RangeError("Invalid evidence limit.");
   // Check permission before obtaining the graph snapshot.
   const decision=await authorize(Object.freeze({
    principalId:authorization.principalId,scope:authorization.scope
   }));
   if(decision!==true)throw denied();
   const snapshot=graph.getGraph();
   if(!snapshot||!Array.isArray(snapshot.nodes))throw new TypeError("Invalid graph snapshot.");
   const tokens=query.toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
   const results=[];
   for(const node of snapshot.nodes){
    if(!plain(node)||!id(node.id))throw new TypeError("Invalid graph node.");
    // Unscoped nodes are inaccessible. No fallback to public.
    if(!plain(node.metadata)||node.metadata.accessScope!==authorization.scope)continue;
    if(typeof node.label!=="string"||!node.label.trim())continue;
    if(!tokens.some(t=>node.label.toLocaleLowerCase().includes(t)))continue;
    results.push(Object.freeze({id:node.id,sourceType:"graph",sourceId:node.id,
      content:node.label,provenance:Object.freeze({origin:"knowledge-graph"})}));
   }
   results.sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
   return Object.freeze(results.slice(0,limit));
  }
 });
}

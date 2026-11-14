/**
 * Hyper XSUS Core — Knowledge Context v0.1.0.
 * Read-only evidence snapshots; no conversation state or graph mutation.
 */
export const KNOWLEDGE_CONTEXT_VERSION = "0.1.0";
const plain = x => x !== null && typeof x === "object" && !Array.isArray(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const validId = x => typeof x === "string" && x.trim().length > 0 && x.length <= 200;
const freeze = x => { if (x && typeof x === "object" && !Object.isFrozen(x)) {
  Object.values(x).forEach(freeze); Object.freeze(x);
} return x; };
export function createKnowledgeContextEngine({provider,maxEvidence=20,maxContentLength=2000}={}){
 if (!provider || typeof provider.getEvidence !== "function")
  throw new TypeError("A read-only evidence provider with getEvidence is required.");
 if (!Number.isSafeInteger(maxEvidence)||maxEvidence<1||maxEvidence>100)
  throw new RangeError("maxEvidence must be 1..100.");
 if (!Number.isSafeInteger(maxContentLength)||maxContentLength<1||maxContentLength>10000)
  throw new RangeError("maxContentLength must be 1..10000.");
 let closed=false;
 async function build({query,language="en",limit=maxEvidence,authorization}={}){
  if(closed)throw new Error("Knowledge Context Engine is closed.");
  if(typeof query!=="string"||!query.trim()||query.length>8000)throw new TypeError("Invalid query.");
  if(typeof language!=="string"||!/^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(language))throw new TypeError("Invalid language.");
  if(!Number.isSafeInteger(limit)||limit<1||limit>maxEvidence)throw new RangeError("Invalid evidence limit.");
  // Authorization must be checked by the provider. Fail closed without an explicit scope.
  if(!plain(authorization)||!validId(authorization.scope))throw new TypeError("Authorization scope is required.");
  const result=await provider.getEvidence({query:query.trim(),language,limit:limit+1,authorization});
  if(!Array.isArray(result))throw new TypeError("Evidence provider must return an array.");
  const seen=new Set(), evidence=[];
  for(const item of result){
   if(!plain(item)||!validId(item.id)||!validId(item.sourceId)||
      !["graph","link"].includes(item.sourceType)||
      typeof item.content!=="string"||!item.content.trim()||
      item.content.length>maxContentLength||
      !plain(item.provenance)||!validId(item.provenance.origin))
    throw new TypeError("Invalid evidence or missing provenance.");
   if(seen.has(item.sourceType+":"+item.sourceId))continue;
   seen.add(item.sourceType+":"+item.sourceId);
   evidence.push({id:item.id,sourceType:item.sourceType,sourceId:item.sourceId,
     content:item.content,provenance:{origin:item.provenance.origin}});
  }
  evidence.sort((a,b)=>a.sourceType.localeCompare(b.sourceType)||
    a.sourceId.localeCompare(b.sourceId)||a.id.localeCompare(b.id));
  return freeze({version:KNOWLEDGE_CONTEXT_VERSION,query:query.trim(),language,
    evidence:evidence.slice(0,limit),truncated:evidence.length>limit});
 }
 return Object.freeze({version:KNOWLEDGE_CONTEXT_VERSION,build,close(){closed=true;}});
}
/** Adapter for the public Graph API; caller supplies access-controlled graph scope. */
export function createGraphEvidenceProvider({graph}={}){
 if(!graph||typeof graph.getGraph!=="function")throw new TypeError("Graph public API is required.");
 return Object.freeze({async getEvidence({query,authorization}){
  if(!plain(authorization)||!validId(authorization.scope))throw new TypeError("Authorization required.");
  const snapshot=graph.getGraph();
  if(!snapshot||!Array.isArray(snapshot.nodes))throw new TypeError("Invalid graph snapshot.");
  const tokens=query.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return snapshot.nodes.filter(n=>typeof n.label==="string"&&
   tokens.some(t=>n.label.toLocaleLowerCase().includes(t))).map(n=>({
    id:n.id,sourceType:"graph",sourceId:n.id,content:n.label,
    provenance:{origin:"knowledge-graph"}
   }));
 }});
}

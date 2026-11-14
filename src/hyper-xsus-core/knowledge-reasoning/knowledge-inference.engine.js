/**
 * Hyper XSUS Core — Rule-based Inference v0.2.0.
 * Pure deterministic transitive inference over verified v0.1.0 claims.
 * No graph writes, semantic/NLP inference, or automatic trust elevation.
 */
export const KNOWLEDGE_INFERENCE_VERSION="0.2.0";
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const valid=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const freeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const key=(s,p,o)=>JSON.stringify([s,p,o]);
/**
 * Only predicates explicitly designated as transitive by the trusted caller
 * are inferred. Never assume "supports", "related_to", etc. are transitive.
 */
export function createKnowledgeInferenceEngine({transitivePredicates=[],maxHops=3,maxInferences=100}={}){
 if(!Array.isArray(transitivePredicates)||transitivePredicates.some(p=>!valid(p))||
    new Set(transitivePredicates).size!==transitivePredicates.length)
  throw new TypeError("Invalid transitive predicate allowlist.");
 if(!Number.isSafeInteger(maxHops)||maxHops<2||maxHops>10)
  throw new RangeError("maxHops must be between 2 and 10.");
 if(!Number.isSafeInteger(maxInferences)||maxInferences<1||maxInferences>1000)
  throw new RangeError("maxInferences must be between 1 and 1000.");
 const allowed=new Set(transitivePredicates);
 let closed=false;
 function infer({analysis}={}){
  if(closed)throw new Error("Knowledge Inference Engine is closed.");
  if(!plain(analysis)||!Array.isArray(analysis.claims)||
     !Array.isArray(analysis.contradictions)||analysis.contradictions.length>0||
     analysis.status!=="no-explicit-conflicts")
   throw new TypeError("Unambiguous verified reasoning analysis required.");
  const claims=analysis.claims, ids=new Set(), asserted=new Set();
  for(const c of claims){
   if(!plain(c)||!valid(c.id)||ids.has(c.id)||!valid(c.subject)||
      !valid(c.predicate)||!valid(c.object)||
      !["positive","negative"].includes(c.polarity)||
      !Array.isArray(c.evidenceIds)||!c.evidenceIds.length||
      c.evidenceIds.some(e=>!valid(e)))
    throw new TypeError("Invalid verified claim.");
   ids.add(c.id);asserted.add(key(c.subject,c.predicate,c.object)+":"+c.polarity);
  }
  const sorted=[...claims].sort((a,b)=>a.id.localeCompare(b.id));
  const inferred=new Map();
  for(const predicate of [...allowed].sort()){
   const edges=sorted.filter(c=>c.predicate===predicate&&c.polarity==="positive");
   const bySource=new Map();
   for(const e of edges){
    if(!bySource.has(e.subject))bySource.set(e.subject,[]);
    bySource.get(e.subject).push(e);
   }
   for(const first of edges){
    const walk=(node,path,visited)=>{
     if(path.length>=2){
      const k=key(first.subject,predicate,node);
      if(!asserted.has(k+":positive")&&!asserted.has(k+":negative")){
       const evidenceIds=[...new Set(path.flatMap(e=>e.evidenceIds))].sort();
       const supportingClaimIds=path.map(e=>e.id);
       const candidate={subject:first.subject,predicate,object:node,
        polarity:"positive",rule:"transitive",hops:path.length,
        supportingClaimIds,evidenceIds};
       const previous=inferred.get(k);
       const signature=x=>JSON.stringify(x.supportingClaimIds);
       if(!previous||candidate.hops<previous.hops||
          (candidate.hops===previous.hops&&signature(candidate)<signature(previous)))
        inferred.set(k,candidate);
      }
     }
     if(path.length===maxHops)return;
     for(const edge of bySource.get(node)||[]){
      if(visited.has(edge.object))continue;
      walk(edge.object,[...path,edge],new Set([...visited,edge.object]));
     }
    };
    walk(first.object,[first],new Set([first.subject,first.object]));
   }
  }
  const all=[...inferred.values()].sort((a,b)=>a.subject.localeCompare(b.subject)||
   a.predicate.localeCompare(b.predicate)||a.object.localeCompare(b.object));
  return freeze({version:KNOWLEDGE_INFERENCE_VERSION,
   inferences:all.slice(0,maxInferences),
   truncated:all.length>maxInferences,
   status:all.length?"inferred":"no-inferences"});
 }
 return Object.freeze({version:KNOWLEDGE_INFERENCE_VERSION,infer,close(){closed=true;}});
}

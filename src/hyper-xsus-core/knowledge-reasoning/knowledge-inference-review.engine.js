/**
 * Hyper XSUS Core — Inference Conflict Review v0.3.0.
 * Read-only advisory review of transitive candidate paths against explicit negative facts.
 * Does not override or mutate the v0.2.0 inference engine.
 */
export const KNOWLEDGE_INFERENCE_REVIEW_VERSION="0.3.0";
const obj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const valid=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const freeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const key=(a,b,c)=>JSON.stringify([a,b,c]);
export function createKnowledgeInferenceReview({transitivePredicates=[],maxHops=3,maxPaths=1000}={}){
 if(!Array.isArray(transitivePredicates)||transitivePredicates.some(x=>!valid(x))||
  new Set(transitivePredicates).size!==transitivePredicates.length)
  throw new TypeError("Invalid transitive predicate allowlist.");
 if(!Number.isSafeInteger(maxHops)||maxHops<2||maxHops>10)
  throw new RangeError("Invalid maxHops.");
 if(!Number.isSafeInteger(maxPaths)||maxPaths<1||maxPaths>10000)
  throw new RangeError("Invalid maxPaths.");
 let closed=false;
 function review({analysis}={}){
  if(closed)throw new Error("Inference review is closed.");
  if(!obj(analysis)||!Array.isArray(analysis.claims)||
   !Array.isArray(analysis.contradictions)||analysis.contradictions.length||
   analysis.status!=="no-explicit-conflicts")
   throw new TypeError("Conflict-free validated claim analysis required.");
  const ids=new Set(), positives=new Set(), negatives=new Map();
  for(const c of analysis.claims){
   if(!obj(c)||!valid(c.id)||ids.has(c.id)||!valid(c.subject)||
    !valid(c.predicate)||!valid(c.object)||
    !["positive","negative"].includes(c.polarity)||
    !Array.isArray(c.evidenceIds)||!c.evidenceIds.length||
    c.evidenceIds.some(x=>!valid(x))||new Set(c.evidenceIds).size!==c.evidenceIds.length)
    throw new TypeError("Invalid analyzed claim.");
   ids.add(c.id);
   const k=key(c.subject,c.predicate,c.object);
   if(c.polarity==="positive")positives.add(k);
   else {if(!negatives.has(k))negatives.set(k,[]);negatives.get(k).push(c);}
  }
  const candidates=new Map();
  let exploredPaths=0, truncated=false;
  outer: for(const predicate of [...transitivePredicates].sort()){
   const edges=analysis.claims.filter(c=>c.polarity==="positive"&&c.predicate===predicate)
    .sort((a,b)=>a.id.localeCompare(b.id));
   const next=new Map();
   for(const edge of edges){
    if(!next.has(edge.subject))next.set(edge.subject,[]);
    next.get(edge.subject).push(edge);
   }
   for(const start of edges){
    const stack=[{node:start.object,path:[start],visited:new Set([start.subject,start.object])}];
    while(stack.length){
     const current=stack.pop();
     if(current.path.length>=2){
      exploredPaths++;
      if(exploredPaths>maxPaths){truncated=true;break outer;}
      const k=key(start.subject,predicate,current.node);
      if(!positives.has(k)){
       const supportIds=current.path.map(c=>c.id);
       const evidenceIds=[...new Set(current.path.flatMap(c=>c.evidenceIds))].sort();
       const candidate={subject:start.subject,predicate,object:current.node,
        rule:"transitive",hops:current.path.length,supportingClaimIds:supportIds,
        evidenceIds,conflictsWith:(negatives.get(k)||[]).map(c=>c.id).sort(),
        status:negatives.has(k)?"blocked-by-explicit-negative":"candidate"};
       const prev=candidates.get(k);
       if(!prev||candidate.hops<prev.hops||
        (candidate.hops===prev.hops&&JSON.stringify(supportIds)<
         JSON.stringify(prev.supportingClaimIds)))candidates.set(k,candidate);
      }
     }
     if(current.path.length===maxHops)continue;
     const neighbors=next.get(current.node)||[];
     for(let i=neighbors.length-1;i>=0;i--){
      const edge=neighbors[i];
      if(current.visited.has(edge.object))continue;
      stack.push({node:edge.object,path:[...current.path,edge],
       visited:new Set([...current.visited,edge.object])});
     }
    }
   }
  }
  const results=[...candidates.values()].sort((a,b)=>
   a.subject.localeCompare(b.subject)||a.predicate.localeCompare(b.predicate)||
   a.object.localeCompare(b.object));
  return freeze({version:KNOWLEDGE_INFERENCE_REVIEW_VERSION,
   candidates:results,truncated,exploredPaths,
   blockedCount:results.filter(x=>x.status==="blocked-by-explicit-negative").length});
 }
 return Object.freeze({version:KNOWLEDGE_INFERENCE_REVIEW_VERSION,review,close(){closed=true;}});
}

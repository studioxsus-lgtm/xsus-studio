/**
 * Hyper XSUS Core — Rule Validation & Explanation v0.4.0.
 * Read-only, fail-closed verification of v0.3.0 candidate lineage.
 * Not a proof that source claims are true or authorized.
 */
export const KNOWLEDGE_RULE_EXPLANATION_VERSION="0.4.0";
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const valid=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const freeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const key=(a,b,c)=>JSON.stringify([a,b,c]);
export function createKnowledgeRuleExplanationEngine({transitivePredicates=[]}={}){
 if(!Array.isArray(transitivePredicates)||transitivePredicates.some(x=>!valid(x))||
  new Set(transitivePredicates).size!==transitivePredicates.length)
  throw new TypeError("Invalid rule allowlist.");
 const allowed=new Set(transitivePredicates);
 let closed=false;
 function explain({analysis,review}={}){
  if(closed)throw new Error("Rule explanation engine is closed.");
  if(!plain(analysis)||!Array.isArray(analysis.claims)||
   !Array.isArray(analysis.contradictions)||analysis.contradictions.length||
   analysis.status!=="no-explicit-conflicts"||
   !plain(review)||review.truncated!==false||!Array.isArray(review.candidates))
   throw new TypeError("Complete conflict-free analysis and review required.");
  const byId=new Map(), negatives=new Map(), positives=new Set();
  for(const c of analysis.claims){
   if(!plain(c)||!valid(c.id)||byId.has(c.id)||!valid(c.subject)||
    !valid(c.predicate)||!valid(c.object)||
    !["positive","negative"].includes(c.polarity)||
    !Array.isArray(c.evidenceIds)||!c.evidenceIds.length||
    c.evidenceIds.some(x=>!valid(x))||
    new Set(c.evidenceIds).size!==c.evidenceIds.length)
    throw new TypeError("Invalid claim lineage.");
   byId.set(c.id,c);
   const k=key(c.subject,c.predicate,c.object);
   if(c.polarity==="positive")positives.add(k);
   else {if(!negatives.has(k))negatives.set(k,[]);negatives.get(k).push(c.id);}
  }
  const seen=new Set(), explanations=[];
  for(const candidate of review.candidates){
   if(!plain(candidate)||candidate.rule!=="transitive"||
    !valid(candidate.subject)||!valid(candidate.predicate)||!valid(candidate.object)||
    !allowed.has(candidate.predicate)||
    !Array.isArray(candidate.supportingClaimIds)||
    candidate.supportingClaimIds.length<2||
    !Array.isArray(candidate.evidenceIds)||
    !Array.isArray(candidate.conflictsWith)||
    !["candidate","blocked-by-explicit-negative"].includes(candidate.status))
    throw new TypeError("Invalid or unauthorized inference rule.");
   const k=key(candidate.subject,candidate.predicate,candidate.object);
   if(seen.has(k)||positives.has(k))throw new TypeError("Duplicate or asserted inference.");
   seen.add(k);
   let cursor=candidate.subject;
   const lineage=[],evidence=new Set(),visited=new Set([cursor]);
   for(const claimId of candidate.supportingClaimIds){
    const c=byId.get(claimId);
    if(!c||c.polarity!=="positive"||c.predicate!==candidate.predicate||
     c.subject!==cursor||visited.has(c.object))
     throw new TypeError("Broken or cyclic inference lineage.");
    lineage.push(claimId);
    c.evidenceIds.forEach(x=>evidence.add(x));
    cursor=c.object;visited.add(cursor);
   }
   if(cursor!==candidate.object||candidate.hops!==lineage.length)
    throw new TypeError("Inference endpoints or hop count mismatch.");
   const expectedEvidence=[...evidence].sort();
   const expectedConflicts=[...(negatives.get(k)||[])].sort();
   if(JSON.stringify(expectedEvidence)!==JSON.stringify(candidate.evidenceIds)||
    JSON.stringify(expectedConflicts)!==JSON.stringify(candidate.conflictsWith)||
    candidate.status!==(expectedConflicts.length?
     "blocked-by-explicit-negative":"candidate"))
    throw new TypeError("Unverified evidence or conflict explanation.");
   explanations.push({subject:candidate.subject,predicate:candidate.predicate,
    object:candidate.object,status:candidate.status,rule:"transitive",
    steps:lineage.map((claimId,i)=>({step:i+1,claimId})),
    evidenceIds:expectedEvidence,conflictingClaimIds:expectedConflicts});
  }
  explanations.sort((a,b)=>a.subject.localeCompare(b.subject)||
   a.predicate.localeCompare(b.predicate)||a.object.localeCompare(b.object));
  return freeze({version:KNOWLEDGE_RULE_EXPLANATION_VERSION,explanations,
   blockedCount:explanations.filter(x=>x.status==="blocked-by-explicit-negative").length});
 }
 return Object.freeze({version:KNOWLEDGE_RULE_EXPLANATION_VERSION,explain,close(){closed=true;}});
}

/**
 * Hyper XSUS Core — Reasoning Verification & Decision v0.5.0.
 * Conservative, read-only decisions over validated v0.4.0 explanations.
 * Approval means structurally eligible for further review, never factual truth.
 */
export const KNOWLEDGE_DECISION_VERSION="0.5.0";
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const id=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const freeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const key=(a,b,c)=>JSON.stringify([a,b,c]);
export function createKnowledgeDecisionEngine({minEvidence=2,maxHops=5,maxDecisions=100}={}){
 if(!Number.isSafeInteger(minEvidence)||minEvidence<1||minEvidence>100||
  !Number.isSafeInteger(maxHops)||maxHops<2||maxHops>10||
  !Number.isSafeInteger(maxDecisions)||maxDecisions<1||maxDecisions>1000)
  throw new RangeError("Invalid decision policy limits.");
 let closed=false;
 function decide({explanationResult,analysis}={}){
  if(closed)throw new Error("Knowledge Decision Engine is closed.");
  if(!plain(explanationResult)||explanationResult.version!=="0.4.0"||
   !Array.isArray(explanationResult.explanations)||
   !plain(analysis)||analysis.status!=="no-explicit-conflicts"||
   !Array.isArray(analysis.claims)||!Array.isArray(analysis.contradictions)||
   analysis.contradictions.length)
   throw new TypeError("Validated explanation and conflict-free analysis required.");
  const claims=new Map();
  for(const c of analysis.claims){
   if(!plain(c)||!id(c.id)||claims.has(c.id)||!id(c.subject)||
    !id(c.predicate)||!id(c.object)||
    !["positive","negative"].includes(c.polarity)||
    !Array.isArray(c.evidenceIds)||!c.evidenceIds.length||
    c.evidenceIds.some(e=>!id(e))||
    new Set(c.evidenceIds).size!==c.evidenceIds.length)
    throw new TypeError("Invalid claim evidence.");
   claims.set(c.id,c);
  }
  const seen=new Set(),results=[];
  if(explanationResult.explanations.length>maxDecisions)
   throw new RangeError("Decision count exceeds configured limit.");
  for(const e of explanationResult.explanations){
   if(!plain(e)||!id(e.subject)||!id(e.predicate)||!id(e.object)||
    e.rule!=="transitive"||!Array.isArray(e.steps)||e.steps.length<2||
    !Array.isArray(e.evidenceIds)||!Array.isArray(e.conflictingClaimIds)||
    !["candidate","blocked-by-explicit-negative"].includes(e.status))
    throw new TypeError("Invalid explanation.");
   const k=key(e.subject,e.predicate,e.object);
   if(seen.has(k))throw new TypeError("Duplicate explanation.");
   seen.add(k);
   const evidence=new Set(),stepIds=new Set(),visited=new Set([e.subject]);
   let cursor=e.subject;
   for(let i=0;i<e.steps.length;i++){
    const step=e.steps[i];
    if(!plain(step)||step.step!==i+1||!id(step.claimId)||stepIds.has(step.claimId))
     throw new TypeError("Invalid explanation step.");
    stepIds.add(step.claimId);
    const c=claims.get(step.claimId);
    if(!c||c.polarity!=="positive"||c.predicate!==e.predicate||
     c.subject!==cursor||visited.has(c.object))
     throw new TypeError("Unverified explanation path.");
    c.evidenceIds.forEach(x=>evidence.add(x));
    cursor=c.object;visited.add(cursor);
   }
   if(cursor!==e.object||JSON.stringify([...evidence].sort())!==
    JSON.stringify(e.evidenceIds))
    throw new TypeError("Explanation evidence mismatch.");
   const actualBlockers=analysis.claims.filter(c=>c.polarity==="negative"&&
    key(c.subject,c.predicate,c.object)===k).map(c=>c.id).sort();
   if(JSON.stringify(actualBlockers)!==JSON.stringify(e.conflictingClaimIds)||
    e.status!==(actualBlockers.length?"blocked-by-explicit-negative":"candidate"))
    throw new TypeError("Unverified conflict status.");
   const reasons=[];
   if(actualBlockers.length)reasons.push("explicit-conflict");
   if(evidence.size<minEvidence)reasons.push("insufficient-distinct-evidence");
   if(e.steps.length>maxHops)reasons.push("hop-limit-exceeded");
   results.push({subject:e.subject,predicate:e.predicate,object:e.object,
    decision:actualBlockers.length?"blocked":reasons.length?"needs-review":"eligible",
    reasons,evidenceIds:[...evidence].sort(),supportingClaimIds:e.steps.map(s=>s.claimId),
    conflictingClaimIds:actualBlockers});
  }
  results.sort((a,b)=>a.subject.localeCompare(b.subject)||
   a.predicate.localeCompare(b.predicate)||a.object.localeCompare(b.object));
  return freeze({version:KNOWLEDGE_DECISION_VERSION,decisions:results,
   summary:{eligible:results.filter(x=>x.decision==="eligible").length,
    needsReview:results.filter(x=>x.decision==="needs-review").length,
    blocked:results.filter(x=>x.decision==="blocked").length}});
 }
 return Object.freeze({version:KNOWLEDGE_DECISION_VERSION,decide,close(){closed=true;}});
}

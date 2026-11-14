/**
 * Hyper XSUS Core — Deterministic Knowledge Reasoning v0.1.0.
 * Explicit claim comparison only. No NLP inference, graph writes or model calls.
 */
export const KNOWLEDGE_REASONING_VERSION="0.1.0";
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const id=x=>typeof x==="string"&&x.trim().length>0&&x.length<=200;
const deepFreeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(deepFreeze);Object.freeze(x);}return x;};
/**
 * Claims are caller-supplied, structured assertions, NOT extracted from prose:
 * {id,subject,predicate,object,polarity:"positive"|"negative",evidenceIds:[...]}.
 * Contradictions mean opposite polarity for the SAME subject/predicate/object.
 */
export function createKnowledgeReasoningEngine({maxClaims=100}={}){
 if(!Number.isSafeInteger(maxClaims)||maxClaims<1||maxClaims>1000)
  throw new RangeError("maxClaims must be between 1 and 1000.");
 let closed=false;
 function analyze({context,claims}={}){
  if(closed)throw new Error("Knowledge Reasoning Engine is closed.");
  if(!plain(context)||!Array.isArray(context.evidence)||context.truncated===true)
   throw new TypeError("Complete evidence context is required.");
  if(!Array.isArray(claims)||claims.length>maxClaims)
   throw new TypeError("Invalid claims array.");
  const evidence=new Map();
  for(const item of context.evidence){
   if(!plain(item)||!id(item.id)||!id(item.sourceId)||
      !["graph","link"].includes(item.sourceType)||!plain(item.provenance)||
      !id(item.provenance.origin)||evidence.has(item.id))
    throw new TypeError("Invalid or duplicate evidence.");
   evidence.set(item.id,item);
  }
  const seen=new Set(), normalized=[];
  for(const claim of claims){
   if(!plain(claim)||!id(claim.id)||seen.has(claim.id)||
      !id(claim.subject)||!id(claim.predicate)||!id(claim.object)||
      !["positive","negative"].includes(claim.polarity)||
      !Array.isArray(claim.evidenceIds)||claim.evidenceIds.length===0||
      claim.evidenceIds.some(e=>!id(e)||!evidence.has(e))||
      new Set(claim.evidenceIds).size!==claim.evidenceIds.length)
    throw new TypeError("Invalid claim or unverified evidence reference.");
   seen.add(claim.id);
   normalized.push({id:claim.id,subject:claim.subject,predicate:claim.predicate,
     object:claim.object,polarity:claim.polarity,
     evidenceIds:[...claim.evidenceIds].sort()});
  }
  normalized.sort((a,b)=>a.id.localeCompare(b.id));
  const groups=new Map();
  for(const claim of normalized){
   const key=JSON.stringify([claim.subject,claim.predicate,claim.object]);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(claim);
  }
  const contradictions=[];
  for(const group of groups.values()){
   const positives=group.filter(x=>x.polarity==="positive");
   const negatives=group.filter(x=>x.polarity==="negative");
   for(const p of positives)for(const n of negatives)
    contradictions.push({positiveClaimId:p.id,negativeClaimId:n.id,
      evidenceIds:[...new Set([...p.evidenceIds,...n.evidenceIds])].sort()});
  }
  contradictions.sort((a,b)=>a.positiveClaimId.localeCompare(b.positiveClaimId)||
   a.negativeClaimId.localeCompare(b.negativeClaimId));
  return deepFreeze({version:KNOWLEDGE_REASONING_VERSION,
   claims:normalized,contradictions,
   status:contradictions.length?"conflicting":"no-explicit-conflicts",
   evidenceCount:evidence.size});
 }
 return Object.freeze({version:KNOWLEDGE_REASONING_VERSION,analyze,close(){closed=true;}});
}

/**
 * Hyper XSUS Core — Decision Audit v0.7.0.
 * Bounded in-memory, hash-chained decision receipts. No raw query, claims,
 * evidence content, or principal identifiers are retained.
 * This is tamper-evident within one process, NOT durable or externally attested.
 */
import {createHash} from "node:crypto";
export const KNOWLEDGE_DECISION_AUDIT_VERSION="0.7.0";
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const freeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const validCount=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000;
export function createKnowledgeDecisionAudit({maxEntries=1000}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>10000)
  throw new RangeError("Invalid audit capacity.");
 let closed=false;
 const records=[];
 let sequence=0,anchorHash="GENESIS";
 function record({result}={}){
  if(closed)throw new Error("Decision audit is closed.");
  if(!plain(result)||result.version!=="0.6.0"||
   !["reviewed","explicit-conflicts","incomplete-review"].includes(result.status)||
   !validCount(result.evidenceCount)||!plain(result.summary)||
   !["eligible","needsReview","blocked"].every(k=>validCount(result.summary[k]))||
   !Array.isArray(result.decisions)||!Array.isArray(result.contradictions))
   throw new TypeError("Invalid pipeline result.");
  if(result.status!=="reviewed"&&
   (result.decisions.length||Object.values(result.summary).some(x=>x!==0)))
   throw new TypeError("Non-reviewed results cannot contain decisions.");
  if(result.status==="reviewed"&&
   (result.contradictions.length||
    result.decisions.length!==Object.values(result.summary).reduce((a,b)=>a+b,0)))
   throw new TypeError("Inconsistent reviewed result.");
  for(const d of result.decisions){
   if(!plain(d)||!["eligible","needs-review","blocked"].includes(d.decision)||
    !Array.isArray(d.evidenceIds)||!Array.isArray(d.supportingClaimIds)||
    !Array.isArray(d.conflictingClaimIds)||!Array.isArray(d.reasons))
    throw new TypeError("Invalid decision receipt.");
  }
  const summary=Object.freeze({
   eligible:result.summary.eligible,needsReview:result.summary.needsReview,
   blocked:result.summary.blocked});
  const payload={sequence:++sequence,previousHash:records.length?
   records[records.length-1].hash:anchorHash,
   status:result.status,evidenceCount:result.evidenceCount,summary,
   // Digest only. Raw evidence and personal identifiers are never stored.
   decisionDigest:hash(result.decisions),
   contradictionDigest:hash(result.contradictions)};
  const entry=freeze({...payload,hash:hash(payload)});
  records.push(entry);
  if(records.length>maxEntries)anchorHash=records.shift().hash;
  return entry;
 }
 function verify(){
  let prev=anchorHash;
  for(const entry of records){
   const {hash:stored,...payload}=entry;
   if(entry.previousHash!==prev||hash(payload)!==stored)return false;
   prev=stored;
  }
  return true;
 }
 function snapshot(){
  return freeze({version:KNOWLEDGE_DECISION_AUDIT_VERSION,
   anchorHash,entries:[...records],valid:verify()});
 }
 return Object.freeze({version:KNOWLEDGE_DECISION_AUDIT_VERSION,
  record,verify,snapshot,close(){closed=true;}});
}

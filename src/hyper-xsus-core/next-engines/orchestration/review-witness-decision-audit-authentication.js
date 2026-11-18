import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAnchorAudit} from "./review-witness-decision-anchor-audit.js";

const blocked=code=>Object.freeze({state:"witness_decision_audit_authentication_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe audit authentication field");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe audit authentication field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const count=x=>Number.isSafeInteger(x)&&x>=0&&x<=28;
const canonical=report=>{
 if(own(report,"state")!=="witness_decision_anchor_audit_observed_for_manual_review"||
  own(report,"nextAction")!=="manual_review"||
  own(report,"recoveryAuthorized")!==false||
  own(report,"deletionAuthorized")!==false||
  own(report,"retrySafe")!==false||
  own(report,"executionAuthorized")!==false||
  own(report,"sideEffects")!==false)throw Error("Unsafe audit state");
 const classification=own(report,"classification"),anchorCount=own(report,"anchorCount");
 const duplicates=own(report,"duplicatePairs"),extensions=own(report,"extensionPairs");
 const competing=own(report,"competingPairs"),references=own(report,"references");
 const digest=own(report,"reportDigest");
 if(!["competing","compatible"].includes(classification)||
  !Number.isSafeInteger(anchorCount)||anchorCount<2||anchorCount>8||
  !count(duplicates)||!count(extensions)||!count(competing)||
  duplicates+extensions+competing!==anchorCount*(anchorCount-1)/2||
  classification!==(competing?"competing":"compatible")||
  !hex(digest)||!Array.isArray(references)||references.length!==anchorCount)
  throw Error("Unsafe audit summary");
 const items=[],seen=new Set();
 for(let i=0;i<references.length;i++){
  const d=Object.getOwnPropertyDescriptor(references,String(i));
  if(!d||!("value" in d))throw Error("Sparse audit references");
  const referenceDigest=own(d.value,"referenceDigest");
  const observationCount=own(d.value,"observationCount");
  if(!hex(referenceDigest)||seen.has(referenceDigest)||
   !Number.isSafeInteger(observationCount)||observationCount<2||observationCount>32)
   throw Error("Unsafe audit reference");
  seen.add(referenceDigest);
  items.push([referenceDigest,observationCount]);
 }
 items.sort((a,b)=>a[0].localeCompare(b[0]));
 return [classification,anchorCount,duplicates,extensions,competing,items,digest];
};
const signature=(key,issuerId,reportId,report)=>createHmac("sha256",key)
 .update(JSON.stringify(["XSUS_WITNESS_AUDIT_AUTH_V1",issuerId,reportId,canonical(report)]))
 .digest("hex");
/**
 * Phase 94: authenticated redacted audit report. Signing attests to bytes
 * supplied by the caller, not independent authority or durable publication.
 * Verification re-computes Phase 93 from source evidence and checks exact
 * canonical report equality before accepting the HMAC.
 */
export function createReviewWitnessDecisionAuditAuthentication({
 report,issuerId,reportId,auditKey
}={}){
 if(!keyOk(auditKey)||!id(issuerId)||!id(reportId))
  throw new EngineContractError("INVALID_INPUT","Invalid audit authentication configuration");
 try{
  return Object.freeze({version:1,issuerId,reportId,
   authenticationTag:signature(auditKey,issuerId,reportId,report)});
 }catch{throw new EngineContractError("INVALID_INPUT","Invalid audit report");}
}
export function inspectReviewWitnessDecisionAuditAuthentication({
 report,authentication,auditKey,expectedIssuerId,expectedReportId,
 anchors,expectedAnchorIds,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!keyOk(auditKey)||!id(expectedIssuerId)||!id(expectedReportId))
  throw new EngineContractError("INVALID_INPUT","Invalid audit authentication trust context");
 try{
  const fresh=inspectReviewWitnessDecisionAnchorAudit({
   anchors,expectedAnchorIds,beforeRegistry,afterRegistry,receipt,authorityKey,
   expectedAttemptId,expectedBeforeEpochId,expectedRegistryRevision,
   expectedMinimumRevision,decision,reviewKey,expectedReviewerId,
   expectedDecisionId,previousRounds,previousChain,trustedPreviousHeadTag,
   trustedPreviousRoundCount,candidates,ledgerId,ledgerKey,chainKey,
   startingRevision,minimumSequence,requiredWitnesses,maxWitnesses,maxRounds});
  if(fresh.state!=="witness_decision_anchor_audit_observed_for_manual_review")
   return blocked("AUDIT_AUTH_EVIDENCE_UNVERIFIED");
  if(JSON.stringify(canonical(report))!==JSON.stringify(canonical(fresh)))
   return blocked("AUDIT_AUTH_REPORT_MISMATCH");
  if(own(authentication,"version")!==1||
   own(authentication,"issuerId")!==expectedIssuerId||
   own(authentication,"reportId")!==expectedReportId)
   return blocked("AUDIT_AUTH_CONTEXT_MISMATCH");
  if(!eq(own(authentication,"authenticationTag"),
   signature(auditKey,expectedIssuerId,expectedReportId,fresh)))
   return blocked("AUDIT_AUTH_SIGNATURE_INVALID");
  return Object.freeze({state:"witness_decision_audit_authenticated_for_manual_review",
   reportDigest:fresh.reportDigest,classification:fresh.classification,
   anchorCount:fresh.anchorCount,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("AUDIT_AUTH_UNVERIFIED");}
}

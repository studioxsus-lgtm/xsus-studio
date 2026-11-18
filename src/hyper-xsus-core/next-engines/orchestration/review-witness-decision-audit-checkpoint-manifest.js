import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAuditCheckpoints} from "./review-witness-decision-audit-checkpoints.js";

const blocked=code=>Object.freeze({state:"witness_decision_audit_manifest_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe manifest field");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe manifest field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const key=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const safeInt=x=>Number.isSafeInteger(x)&&x>=0;
const canonical=(input)=>{
 const {expectedReportIds,expectedReportDigests,expectedFirstSequence,
  expectedLastSequence,expectedIssuerId}=input;
 if(!id(expectedIssuerId)||!Array.isArray(expectedReportIds)||
  !Array.isArray(expectedReportDigests)||expectedReportIds.length<2||
  expectedReportIds.length>16||expectedReportIds.length!==expectedReportDigests.length||
  !safeInt(expectedFirstSequence)||!safeInt(expectedLastSequence)||
  expectedLastSequence-expectedFirstSequence!==expectedReportIds.length-1)
  throw Error("Unsafe manifest configuration");
 const entries=[],seen=new Set();
 for(let i=0;i<expectedReportIds.length;i++){
  const a=Object.getOwnPropertyDescriptor(expectedReportIds,String(i));
  const b=Object.getOwnPropertyDescriptor(expectedReportDigests,String(i));
  if(!a||!("value" in a)||!b||!("value" in b)||
   !id(a.value)||!hex(b.value)||seen.has(a.value))
   throw Error("Unsafe manifest entry");
  seen.add(a.value);
  entries.push([expectedFirstSequence+i,a.value,b.value]);
 }
 return [expectedIssuerId,expectedFirstSequence,expectedLastSequence,entries];
};
const tag=(input,manifestKey,manifestId)=>createHmac("sha256",manifestKey)
 .update(JSON.stringify(["XSUS_AUDIT_CHECKPOINT_MANIFEST_V1",manifestId,canonical(input)]))
 .digest("hex");
const equal=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
/**
 * Phase 98: HMAC checkpoint manifest bound to issuer, report IDs, ordered
 * sequence and digest values. Trusted manifest tag/key MUST be obtained
 * independently; signing alone does not establish publication or freshness.
 */
export function createReviewWitnessDecisionAuditCheckpointManifest({
 manifestId,manifestKey,...input
}={}){
 if(!id(manifestId)||!key(manifestKey))
  throw new EngineContractError("INVALID_INPUT","Invalid checkpoint manifest signing context");
 try{return Object.freeze({version:1,manifestId,authenticationTag:tag(input,manifestKey,manifestId)});}
 catch{throw new EngineContractError("INVALID_INPUT","Invalid checkpoint manifest contents");}
}
export function inspectReviewWitnessDecisionAuditCheckpointManifest({
 manifest,manifestKey,expectedManifestId,trustedManifestTag,...context
}={}){
 if(!key(manifestKey)||!id(expectedManifestId)||!hex(trustedManifestTag))
  throw new EngineContractError("INVALID_INPUT","Invalid checkpoint manifest trust context");
 try{
  if(own(manifest,"version")!==1||own(manifest,"manifestId")!==expectedManifestId)
   return blocked("AUDIT_MANIFEST_CONTEXT_MISMATCH");
  const actual=own(manifest,"authenticationTag");
  const calculated=tag(context,manifestKey,expectedManifestId);
  if(!equal(actual,calculated)||!equal(actual,trustedManifestTag))
   return blocked("AUDIT_MANIFEST_AUTHENTICATION_UNVERIFIED");
  const result=inspectReviewWitnessDecisionAuditCheckpoints(context);
  if(result.state!=="witness_decision_audit_checkpoints_observed_for_manual_review")
   return blocked("AUDIT_MANIFEST_CHECKPOINTS_UNVERIFIED");
  return Object.freeze({state:"witness_decision_audit_manifest_observed_for_manual_review",
   reportCount:result.reportCount,firstSequence:result.firstSequence,
   lastSequence:result.lastSequence,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("AUDIT_MANIFEST_UNVERIFIED");}
}

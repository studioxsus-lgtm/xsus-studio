import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAuditCheckpointManifest} from "./review-witness-decision-audit-checkpoint-manifest.js";

const blocked=code=>Object.freeze({state:"witness_decision_manifest_continuity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe manifest continuity field");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe manifest continuity field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 99: verify two independently anchored audit manifests and their
 * contiguous sequence ranges. Trusted manifest tags, issuer, keys and range
 * boundaries MUST come from independent authority. This is NOT proof that
 * no reports exist before or after the supplied ranges.
 */
export function inspectReviewWitnessDecisionAuditManifestContinuity({
 earlier,later,expectedIssuerId,expectedFirstSequence,expectedLastSequence
}={}){
 if(!id(expectedIssuerId)||!seq(expectedFirstSequence)||
  !seq(expectedLastSequence)||expectedLastSequence<expectedFirstSequence)
  throw new EngineContractError("INVALID_INPUT","Invalid manifest continuity trust context");
 try{
  const a=own(earlier,"context"),b=own(later,"context");
  if(own(a,"expectedIssuerId")!==expectedIssuerId||
   own(b,"expectedIssuerId")!==expectedIssuerId)
   return blocked("AUDIT_MANIFEST_CONTINUITY_ISSUER_MISMATCH");
  const first=own(a,"expectedFirstSequence"),last=own(b,"expectedLastSequence");
  const middleA=own(a,"expectedLastSequence"),middleB=own(b,"expectedFirstSequence");
  if(!seq(first)||!seq(last)||!seq(middleA)||!seq(middleB)||
   first!==expectedFirstSequence||last!==expectedLastSequence||
   middleA===Number.MAX_SAFE_INTEGER||middleA+1!==middleB)
   return blocked("AUDIT_MANIFEST_CONTINUITY_SEQUENCE_MISMATCH");
  const idA=own(earlier,"expectedManifestId"),idB=own(later,"expectedManifestId");
  if(!id(idA)||!id(idB)||idA===idB)
   return blocked("AUDIT_MANIFEST_CONTINUITY_REPLAY");
  const inspect=entry=>inspectReviewWitnessDecisionAuditCheckpointManifest({
   ...own(entry,"context"),manifest:own(entry,"manifest"),
   manifestKey:own(entry,"manifestKey"),
   expectedManifestId:own(entry,"expectedManifestId"),
   trustedManifestTag:own(entry,"trustedManifestTag")
  });
  const verdictA=inspect(earlier),verdictB=inspect(later);
  if(verdictA.state!=="witness_decision_audit_manifest_observed_for_manual_review"||
   verdictB.state!=="witness_decision_audit_manifest_observed_for_manual_review")
   return blocked("AUDIT_MANIFEST_CONTINUITY_AUTHENTICATION_UNVERIFIED");
  return Object.freeze({state:"witness_decision_manifest_continuity_observed_for_manual_review",
   manifestCount:2,reportCount:verdictA.reportCount+verdictB.reportCount,
   firstSequence:first,lastSequence:last,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("AUDIT_MANIFEST_CONTINUITY_UNVERIFIED");}
}

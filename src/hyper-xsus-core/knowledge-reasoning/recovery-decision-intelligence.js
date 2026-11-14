/**
 * Hyper XSUS Core v5.4 — advisory recovery decision intelligence.
 * Recommendations never authorize promotion, repair, or state mutation.
 */
export const RECOVERY_DECISION_VERSION="5.4.0";
const invalid=()=>Object.assign(new TypeError("Invalid recovery diagnostics."),{code:"XSUS_RECOVERY_DECISION_INVALID"});
const actions=Object.freeze({
 integrity:"VERIFY_SIGNED_EVIDENCE_AND_ESCALATE",
 "unanchored-evidence":"REVIEW_UNANCHORED_EVIDENCE",
 "writer-lock":"INVESTIGATE_WRITER_LOCK",
 "incomplete-write":"REVIEW_INCOMPLETE_WRITE",
 unclassified:"ESCALATE_UNKNOWN_BLOCKER"
});
export function decideRecoveryActions(diagnostics){
 if(!diagnostics||typeof diagnostics!=="object"||
  !["ready","manual-intervention-required"].includes(diagnostics.status)||
  typeof diagnostics.safeToResume!=="boolean"||
  typeof diagnostics.requiresManualReview!=="boolean"||
  !Array.isArray(diagnostics.incidents)||
  (diagnostics.safeToResume&&(diagnostics.status!=="ready"||
   diagnostics.requiresManualReview||diagnostics.incidents.length!==0))||
  (!diagnostics.safeToResume&&(diagnostics.status!=="manual-intervention-required"||
   !diagnostics.requiresManualReview)))
  throw invalid();
 const recommendations=[];
 const seen=new Set();
 for(const incident of diagnostics.incidents){
  if(!incident||typeof incident.code!=="string"||!incident.code||
   typeof incident.category!=="string"||!incident.category||
   !["high","critical"].includes(incident.severity)||
   incident.requiresManualReview!==true)throw invalid();
  if(seen.has(incident.code))throw invalid();
  seen.add(incident.code);
  const action=actions[incident.category]??actions.unclassified;
  recommendations.push(Object.freeze({
   incidentCode:incident.code,
   action,
   priority:incident.severity==="critical"?"critical":"high",
   requiresHumanApproval:true
  }));
 }
 if(!diagnostics.safeToResume&&recommendations.length===0)
  recommendations.push(Object.freeze({
   incidentCode:"UNSPECIFIED_BLOCKER",action:"ESCALATE_UNKNOWN_BLOCKER",
   priority:"high",requiresHumanApproval:true
  }));
 recommendations.sort((a,b)=>(a.priority==="critical"?0:1)-(b.priority==="critical"?0:1)||
  a.incidentCode.localeCompare(b.incidentCode));
 return Object.freeze({
  version:RECOVERY_DECISION_VERSION,
  status:diagnostics.safeToResume?"ready":"manual-intervention-required",
  safeToResume:diagnostics.safeToResume,
  requiresManualReview:!diagnostics.safeToResume,
  recommendedActions:Object.freeze(recommendations)
 });
}
export function createRecoveryDecisionIntelligence({inspectRecoveryDiagnostics}={}){
 if(typeof inspectRecoveryDiagnostics!=="function")
  throw new TypeError("Recovery diagnostics reader required.");
 return Object.freeze({
  version:RECOVERY_DECISION_VERSION,
  assess:async()=>decideRecoveryActions(await inspectRecoveryDiagnostics())
 });
}

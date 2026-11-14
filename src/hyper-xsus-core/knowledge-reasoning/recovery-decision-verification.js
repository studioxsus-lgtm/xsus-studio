/**
 * Hyper XSUS Core v5.5 — verifies advisory decisions against stable
 * authenticated operational snapshots. Never executes recommendations.
 */
import {classifyRecoveryOperationalReport} from "./recovery-diagnostics.js";
import {decideRecoveryActions} from "./recovery-decision-intelligence.js";
export const RECOVERY_DECISION_VERIFICATION_VERSION="5.5.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
function fingerprint(report){
 if(!report||typeof report!=="object"||
  !["ready","manual-intervention-required"].includes(report.status)||
  typeof report.safeToResume!=="boolean"||!Array.isArray(report.blockers)||
  report.blockers.some(b=>typeof b!=="string"||!b)||
  !report.archive||!report.checkpoint||
  !Number.isSafeInteger(report.archive.count)||report.archive.count<0||
  !Number.isSafeInteger(report.checkpoint.count)||report.checkpoint.count<0||
  !/^[a-f0-9]{64}$/.test(report.archive.tip)||
  !/^[a-f0-9]{64}$/.test(report.checkpoint.tip))
  throw fail("XSUS_RECOVERY_DECISION_VERIFY_INVALID","Invalid authenticated operational snapshot.");
 return JSON.stringify([
  report.status,report.safeToResume,[...new Set(report.blockers)].sort(),
  report.archive.count,report.archive.tip,report.checkpoint.count,report.checkpoint.tip
 ]);
}
export function createRecoveryDecisionVerification({inspectOperationalReadiness}={}){
 if(typeof inspectOperationalReadiness!=="function")
  throw new TypeError("Operational readiness reader required.");
 async function assess(){
  const initial=await inspectOperationalReadiness();
  const first=fingerprint(initial);
  const decisions=decideRecoveryActions(classifyRecoveryOperationalReport(initial));
  const final=await inspectOperationalReadiness();
  if(fingerprint(final)!==first)
   throw fail("XSUS_RECOVERY_DECISION_STALE","Operational snapshot changed during decision verification.");
  return Object.freeze({
   version:RECOVERY_DECISION_VERIFICATION_VERSION,
   verified:true,
   status:decisions.status,
   safeToResume:decisions.safeToResume,
   requiresManualReview:decisions.requiresManualReview,
   recommendedActions:decisions.recommendedActions,
   snapshot:Object.freeze({
    archive:Object.freeze({count:initial.archive.count,tip:initial.archive.tip}),
    checkpoint:Object.freeze({count:initial.checkpoint.count,tip:initial.checkpoint.tip})
   })
  });
 }
 return Object.freeze({version:RECOVERY_DECISION_VERIFICATION_VERSION,assess});
}

/**
 * Hyper XSUS Core v5.6 — bounded, process-local recovery decision audit.
 * Hashes detect accidental mutation, not adversarial tampering. No persistence.
 */
import {createHash} from "node:crypto";
export const RECOVERY_AUDIT_VERSION="5.6.0";
const ZERO="0".repeat(64);
const fail=(code,message)=>Object.assign(new Error(message),{code});
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const validTip=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
function normalize(result){
 if(!result||result.verified!==true||typeof result.safeToResume!=="boolean"||
  !["ready","manual-intervention-required"].includes(result.status)||
  result.status!==(result.safeToResume?"ready":"manual-intervention-required")||
  result.requiresManualReview===result.safeToResume||
  !result.snapshot||!result.snapshot.archive||!result.snapshot.checkpoint||
  !Array.isArray(result.recommendedActions)||
  result.recommendedActions.some(a=>!a||typeof a.incidentCode!=="string"||!a.incidentCode||
   typeof a.action!=="string"||!a.action||!["high","critical"].includes(a.priority)||
   a.requiresHumanApproval!==true)||
  (result.safeToResume&&result.recommendedActions.length!==0))
  throw fail("XSUS_RECOVERY_AUDIT_INVALID","Invalid verified recovery decision.");
 const {archive,checkpoint}=result.snapshot;
 if(!Number.isSafeInteger(archive.count)||archive.count<0||!validTip(archive.tip)||
  !Number.isSafeInteger(checkpoint.count)||checkpoint.count<0||!validTip(checkpoint.tip))
  throw fail("XSUS_RECOVERY_AUDIT_INVALID","Invalid verified snapshot.");
 return {
  status:result.status,safeToResume:result.safeToResume,
  requiresManualReview:result.requiresManualReview,
  archive:{count:archive.count,tip:archive.tip},
  checkpoint:{count:checkpoint.count,tip:checkpoint.tip},
  recommendations:result.recommendedActions.map(a=>({
   incidentCode:a.incidentCode,action:a.action,priority:a.priority,
   requiresHumanApproval:true
  }))
 };
}
function immutable(entry){
 return Object.freeze({
  ...entry,
  snapshot:Object.freeze({
   archive:Object.freeze({...entry.snapshot.archive}),
   checkpoint:Object.freeze({...entry.snapshot.checkpoint})
  }),
  recommendations:Object.freeze(entry.recommendations.map(a=>Object.freeze({...a})))
 });
}
export function createRecoveryDecisionAudit({verifyRecoveryDecisions,maxEntries=1000}={}){
 if(typeof verifyRecoveryDecisions!=="function"||
  !Number.isSafeInteger(maxEntries)||maxEntries<1)
  throw new TypeError("Recovery verifier and positive maxEntries required.");
 const entries=[];
 let tail=ZERO,sequence=0;
 let queue=Promise.resolve();
 async function record(){
  const work=queue.then(async()=>{
   const verified=normalize(await verifyRecoveryDecisions());
   if(entries.length>=maxEntries)
    throw fail("XSUS_RECOVERY_AUDIT_FULL","Recovery audit capacity reached; no entries discarded.");
   const previous=entries.at(-1);
   const changed=previous===undefined?false:
    JSON.stringify(previous.snapshot)!==JSON.stringify({
     archive:verified.archive,checkpoint:verified.checkpoint
    })||previous.status!==verified.status||
    previous.safeToResume!==verified.safeToResume||
    JSON.stringify(previous.recommendations)!==JSON.stringify(verified.recommendations);
   const body={
    sequence:sequence+1,previousHash:tail,
    status:verified.status,safeToResume:verified.safeToResume,
    requiresManualReview:verified.requiresManualReview,
    changed,
    snapshot:{archive:verified.archive,checkpoint:verified.checkpoint},
    recommendations:verified.recommendations
   };
   const entry=immutable({...body,hash:hash(body)});
   entries.push(entry);sequence=entry.sequence;tail=entry.hash;
   return entry;
  });
  queue=work.then(()=>{},()=>{});
  return work;
 }
 function history(){return Object.freeze([...entries]);}
 function verify(){
  let prior=ZERO;
  for(let i=0;i<entries.length;i++){
   const entry=entries[i];
   const {hash:actual,...body}=entry;
   if(entry.sequence!==i+1||entry.previousHash!==prior||hash(body)!==actual)
    throw fail("XSUS_RECOVERY_AUDIT_INTEGRITY","Recovery audit hash chain mismatch.");
   prior=actual;
  }
  return Object.freeze({version:RECOVERY_AUDIT_VERSION,valid:true,count:entries.length,tip:prior});
 }
 return Object.freeze({version:RECOVERY_AUDIT_VERSION,record,history,verify});
}

/**
 * Hyper XSUS Core v8.1.7 — independently verified checkpoint integration.
 * The checkpoint project must be administered separately from the audit store.
 * No automatic checkpoint advancement, bootstrap or recovery authorization.
 */
import {createRemoteCheckpointStorage} from "./remote-checkpoint-storage-v816.js";
import {createTrustedCheckpointProtocol} from "./trusted-checkpoint-v815.js";
import {createSupabaseAuditIntegrity} from "./supabase-audit-integrity-v812.js";
import {createSupabaseRestartGate} from "./supabase-restart-gate-v813.js";

export const TRUSTED_CHECKPOINT_INTEGRATION_VERSION="8.1.7";
const fail=code=>Object.assign(new Error(code),{code});

export function createTrustedCheckpointIntegration({
 auditStorage,auditKey,auditKeyId,
 checkpointUrl,checkpointAccessKey,checkpointSigningKey,checkpointKeyId,
 fetchImpl,checkpointStorage
}={}){
 if(!auditStorage||typeof auditStorage.list!=="function")
  throw new TypeError("Independent audit storage required.");
 const remote=checkpointStorage??createRemoteCheckpointStorage({
  url:checkpointUrl,key:checkpointAccessKey,...(fetchImpl?{fetchImpl}:{})
 });
 const protocol=createTrustedCheckpointProtocol({
  key:checkpointSigningKey,keyId:checkpointKeyId,
  readCheckpoint:remote.readCheckpoint,
  compareAndSwap:remote.compareAndSwap
 });
 const integrity=createSupabaseAuditIntegrity({
  key:auditKey,keyId:auditKeyId,storage:auditStorage
 });
 const gate=createSupabaseRestartGate({
  verifyAudit:()=>integrity.verify(),
  readTrustedCheckpoint:async()=>{
   const checkpoint=await protocol.read();
   return {count:checkpoint.count,tip:checkpoint.tip};
  }
 });
 async function inspect(){
  const result=await gate.assess();
  return Object.freeze({
   version:TRUSTED_CHECKPOINT_INTEGRATION_VERSION,
   status:result.status,verified:result.verified,
   recoveryAuthorized:false,safeToResume:false,
   ...(result.verified?{count:result.count,tip:result.tip}:{
    blockers:Object.freeze([...result.blockers])})
  });
 }
 async function advanceReviewed({authorize}={}){
  if(typeof authorize!=="function")throw fail("XSUS_CHECKPOINT_REVIEW_REQUIRED");
  // A reviewer callback is a server-only authorization boundary; it must
  // validate identity, permission and explicit approval, not just return true.
  const approved=await authorize();
  if(approved!==true)throw fail("XSUS_CHECKPOINT_REVIEW_DENIED");
  const previous=await protocol.read();
  const verifiedAudit=await integrity.verify();
  if(verifiedAudit.count!==previous.count+1)
   throw fail("XSUS_CHECKPOINT_ADVANCE_NOT_SINGLE_STEP");
  // The signed chain verifier checks every entry, including its prefix.
  const next=protocol.sign(verifiedAudit.count,verifiedAudit.tip);
  return protocol.advance({expected:previous,next,verifiedAudit});
 }
 return Object.freeze({
  version:TRUSTED_CHECKPOINT_INTEGRATION_VERSION,inspect,advanceReviewed
 });
}

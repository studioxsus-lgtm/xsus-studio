/**
 * Hyper XSUS Core v8.1.8 — orchestrated audit/checkpoint/restart verification.
 * Restart is simulated by constructing fresh instances over durable adapters.
 * No automatic approval, bootstrap or recovery authorization.
 */
import {createSupabaseAuditPipeline} from "./supabase-audit-pipeline-v814.js";
import {createTrustedCheckpointIntegration} from "./trusted-checkpoint-integration-v817.js";
import {createTrustedCheckpointProtocol} from "./trusted-checkpoint-v815.js";

export const RECOVERY_LIFECYCLE_VERSION="8.1.8";
const fail=code=>Object.assign(new Error(code),{code});

export function createRecoveryLifecycle({
 auditStorage,auditKey,auditKeyId,
 checkpointStorage,checkpointSigningKey,checkpointKeyId,
 createEventId
}={}){
 if(!auditStorage||typeof auditStorage.append!=="function"||
  typeof auditStorage.list!=="function"||!checkpointStorage||
  typeof checkpointStorage.readCheckpoint!=="function"||
  typeof checkpointStorage.compareAndSwap!=="function")
  throw new TypeError("Durable audit and independent checkpoint adapters required.");

 function createIntegration(){
  return createTrustedCheckpointIntegration({
   auditStorage,auditKey,auditKeyId,checkpointStorage,
   checkpointSigningKey,checkpointKeyId
  });
 }
 async function inspect(){
  return createIntegration().inspect();
 }
 async function appendAndReview({payload,authorize}={}){
  if(typeof authorize!=="function")
   throw fail("XSUS_LIFECYCLE_REVIEW_REQUIRED");
  // Require explicit reviewer authorization before any write.
  // This is a policy callback, not an authentication implementation.
  if(await authorize()!==true)
   throw fail("XSUS_LIFECYCLE_REVIEW_DENIED");
  const checkpoint=createIntegration();
  const initial=await checkpoint.inspect();
  if(!initial.verified)throw fail("XSUS_LIFECYCLE_NOT_READY");

  // Verify the checkpoint signature for the pipeline through the protocol.
  const signed=createTrustedCheckpointProtocol({
   key:checkpointSigningKey,keyId:checkpointKeyId,
   readCheckpoint:checkpointStorage.readCheckpoint,
   compareAndSwap:checkpointStorage.compareAndSwap
  });
  const pipeline=createSupabaseAuditPipeline({
   storage:auditStorage,key:auditKey,keyId:auditKeyId,
   readTrustedCheckpoint:async()=>{
    const r=await signed.read();return {count:r.count,tip:r.tip};
   },
   ...(createEventId?{createEventId}:{})
  });
  const pending=await pipeline.append(payload);
  // Review again before advancing checkpoint; the callback must revalidate
  // authorization at the time of checkpoint advancement.
  const advanced=await checkpoint.advanceReviewed({authorize});
  if(advanced.count!==pending.count||advanced.tip!==pending.tip)
   throw fail("XSUS_LIFECYCLE_ADVANCE_MISMATCH");
  const confirmed=await createIntegration().inspect();
  if(!confirmed.verified||confirmed.count!==pending.count||
   confirmed.tip!==pending.tip)
   throw fail("XSUS_LIFECYCLE_POSTVERIFY_FAILED");
  return Object.freeze({
   version:RECOVERY_LIFECYCLE_VERSION,status:"verified",
   count:confirmed.count,tip:confirmed.tip,
   recoveryAuthorized:false,safeToResume:false
  });
 }
 return Object.freeze({version:RECOVERY_LIFECYCLE_VERSION,inspect,appendAndReview});
}

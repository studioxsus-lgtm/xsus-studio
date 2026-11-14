/**
 * Hyper XSUS Core v8.1.4 — fail-closed audit integration pipeline.
 * This adapter does not replace the trusted checkpoint or grant recovery.
 * Appends require an exact checkpoint match before and after the operation;
 * an external reviewer must advance the checkpoint separately.
 */
import {randomUUID} from "node:crypto";
import {createSupabaseAuditIntegrity} from "./supabase-audit-integrity-v812.js";
import {createSupabaseRestartGate} from "./supabase-restart-gate-v813.js";

export const SUPABASE_AUDIT_PIPELINE_VERSION="8.1.4";
const fail=code=>Object.assign(new Error(code),{code});
const HEX=/^[a-f0-9]{64}$/;

export function createSupabaseAuditPipeline({
 storage,key,keyId,readTrustedCheckpoint,createEventId=randomUUID
}={}){
 if(!storage||typeof storage.list!=="function"||
  typeof storage.append!=="function"||
  typeof readTrustedCheckpoint!=="function"||
  typeof createEventId!=="function")
  throw new TypeError("Storage, trusted checkpoint reader and event ID provider required.");
 const integrity=createSupabaseAuditIntegrity({key,keyId,storage});
 const gate=createSupabaseRestartGate({
  verifyAudit:()=>integrity.verify(),readTrustedCheckpoint
 });
 async function inspect(){
  const report=await gate.assess();
  return Object.freeze({version:SUPABASE_AUDIT_PIPELINE_VERSION,
   status:report.status,verified:report.verified,
   recoveryAuthorized:false,safeToResume:false,
   ...(report.verified?{count:report.count,tip:report.tip}:{
    blockers:Object.freeze([...report.blockers])})});
 }
 async function append(payload){
  const initial=await gate.assess();
  if(!initial.verified)throw fail("XSUS_AUDIT_PIPELINE_NOT_READY");
  if(!payload||typeof payload!=="object"||Array.isArray(payload))
   throw fail("XSUS_AUDIT_PIPELINE_INVALID_PAYLOAD");
  let copy;
  try{copy=structuredClone(payload);}
  catch{throw fail("XSUS_AUDIT_PIPELINE_INVALID_PAYLOAD");}
  const signed=integrity.signEntry({
   sequence:initial.count+1,previous_hash:initial.tip,payload:copy
  });
  const event_id=createEventId();
  if(typeof event_id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event_id))
   throw fail("XSUS_AUDIT_PIPELINE_INVALID_EVENT_ID");
  // Database RPC must atomically compare sequence and previous hash.
  // A timeout after commit is uncertain: never retry blindly.
  let stored;
  try{stored=await storage.append({event_id,...signed});}
  catch{throw fail("XSUS_AUDIT_PIPELINE_WRITE_UNCERTAIN");}
  if(!stored||stored.entry_hash!==signed.entry_hash||
   stored.sequence!==signed.sequence)
   throw fail("XSUS_AUDIT_PIPELINE_WRITE_UNCERTAIN");
  // Audit integrity must be verified independently after write.
  // The trusted checkpoint intentionally still points to the previous tip;
  // an authorized external process must advance it.
  let after;
  try{after=await integrity.verify();}
  catch{throw fail("XSUS_AUDIT_PIPELINE_POSTVERIFY_FAILED");}
  if(after.count!==signed.sequence||after.tip!==signed.entry_hash)
   throw fail("XSUS_AUDIT_PIPELINE_POSTVERIFY_FAILED");
  const checkpoint=await readTrustedCheckpoint().catch(()=>{
   throw fail("XSUS_AUDIT_PIPELINE_CHECKPOINT_UNAVAILABLE");
  });
  if(!checkpoint||checkpoint.count!==initial.count||
   checkpoint.tip!==initial.tip)
   throw fail("XSUS_AUDIT_PIPELINE_CHECKPOINT_CHANGED");
  return Object.freeze({version:SUPABASE_AUDIT_PIPELINE_VERSION,
   status:"pending-trusted-checkpoint",count:after.count,tip:after.tip,
   recoveryAuthorized:false,safeToResume:false});
 }
 return Object.freeze({version:SUPABASE_AUDIT_PIPELINE_VERSION,inspect,append});
}

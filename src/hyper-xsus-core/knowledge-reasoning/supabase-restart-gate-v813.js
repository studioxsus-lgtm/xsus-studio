/**
 * Hyper XSUS Core v8.1.3 — read-only restart recovery gate.
 * Requires a separately trusted checkpoint. Never authorizes recovery.
 * A database row or a checkpoint in the same trust domain is NOT sufficient
 * to claim protection against coordinated rollback.
 */
export const SUPABASE_RESTART_GATE_VERSION="8.1.3";
const HEX=/^[a-f0-9]{64}$/;
const fail=code=>Object.assign(new Error(code),{code});

export function createSupabaseRestartGate({verifyAudit,readTrustedCheckpoint}={}){
 if(typeof verifyAudit!=="function"||typeof readTrustedCheckpoint!=="function")
  throw new TypeError("Audit verifier and independent trusted checkpoint reader required.");
 async function assess(){
  // Fail closed on unavailable, uninitialized, or malformed checkpoints.
  try{
   const before=await readTrustedCheckpoint();
   if(!before||!Number.isSafeInteger(before.count)||before.count<0||
      typeof before.tip!=="string"||!HEX.test(before.tip))
    throw fail("XSUS_RESTART_CHECKPOINT_INVALID");
   const audit=await verifyAudit();
   if(!audit||audit.verified!==true||
      !Number.isSafeInteger(audit.count)||audit.count<0||
      typeof audit.tip!=="string"||!HEX.test(audit.tip))
    throw fail("XSUS_RESTART_AUDIT_UNVERIFIED");
   const after=await readTrustedCheckpoint();
   if(!after||after.count!==before.count||after.tip!==before.tip)
    throw fail("XSUS_RESTART_CHECKPOINT_CHANGED");
   // A checkpoint may lag a valid audit, but this read-only gate cannot
   // authenticate that checkpoint's prefix without additional proof.
   // Require an exact match until a prefix-proof protocol exists.
   if(audit.count!==before.count||audit.tip!==before.tip)
    throw fail("XSUS_RESTART_CHECKPOINT_MISMATCH");
   return Object.freeze({
    version:SUPABASE_RESTART_GATE_VERSION,status:"verified",
    verified:true,safeToResume:false,count:audit.count,tip:audit.tip,
    recoveryAuthorized:false
   });
  }catch(error){
   const known=new Set([
    "XSUS_RESTART_CHECKPOINT_INVALID","XSUS_RESTART_AUDIT_UNVERIFIED",
    "XSUS_RESTART_CHECKPOINT_CHANGED","XSUS_RESTART_CHECKPOINT_MISMATCH"
   ]);
   return Object.freeze({
    version:SUPABASE_RESTART_GATE_VERSION,status:"manual-intervention-required",
    verified:false,safeToResume:false,recoveryAuthorized:false,
    blockers:Object.freeze([known.has(error?.code)?error.code:"XSUS_RESTART_VERIFICATION_UNAVAILABLE"])
   });
  }
 }
 return Object.freeze({version:SUPABASE_RESTART_GATE_VERSION,assess});
}

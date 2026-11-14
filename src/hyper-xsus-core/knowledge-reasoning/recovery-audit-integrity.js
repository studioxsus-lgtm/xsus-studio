/**
 * Hyper XSUS Core v5.8 — read-only recovery audit integrity assessment.
 * External anchor is caller supplied; without it valid signed rollback is undetectable.
 */
import {lstat} from "node:fs/promises";
import {join} from "node:path";
export const RECOVERY_AUDIT_INTEGRITY_VERSION="5.8.0";
const HEX=/^[a-f0-9]{64}$/;
const ZERO="0".repeat(64);
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function createRecoveryAuditIntegrity({readDurableAudit,directory}={}){
 if(typeof readDurableAudit!=="function"||typeof directory!=="string"||!directory)
  throw new TypeError("Durable audit reader and directory required.");
 async function assess({trustedAnchor}={}){
  if(trustedAnchor!==undefined&&(!trustedAnchor||
   !Number.isSafeInteger(trustedAnchor.count)||trustedAnchor.count<0||
   typeof trustedAnchor.tip!=="string"||!HEX.test(trustedAnchor.tip)||
   (trustedAnchor.count===0&&trustedAnchor.tip!==ZERO)))
   throw fail("XSUS_AUDIT_INTEGRITY_ANCHOR_INVALID","Invalid trusted audit anchor.");
  const blockers=[];
  for(const [name,code] of [
   ["audit.lock","AUDIT_WRITER_LOCK_REVIEW_REQUIRED"],
   ["audit.pending","AUDIT_PENDING_REVIEW_REQUIRED"]
  ]){
   try{await lstat(join(directory,name));blockers.push(code);}
   catch(e){if(e.code!=="ENOENT")throw e;}
  }
  let state=null;
  try{state=await readDurableAudit();}
  catch(e){
   if(e.code==="XSUS_DURABLE_AUDIT_UNINITIALIZED")blockers.push("AUDIT_UNINITIALIZED");
   else if(typeof e.code==="string"&&e.code.startsWith("XSUS_DURABLE_AUDIT_"))
    blockers.push("AUDIT_INTEGRITY_REVIEW_REQUIRED");
   else throw e;
  }
  if(state){
   if(!Number.isSafeInteger(state.count)||state.count<0||
    !HEX.test(state.tip)||!Array.isArray(state.entries)||state.entries.length!==state.count)
    throw fail("XSUS_AUDIT_INTEGRITY_INVALID","Invalid durable audit reader result.");
   if(trustedAnchor){
    if(state.count<trustedAnchor.count)blockers.push("AUDIT_ROLLBACK_REVIEW_REQUIRED");
    else if(state.count===trustedAnchor.count&&state.tip!==trustedAnchor.tip)
     blockers.push("AUDIT_ANCHOR_MISMATCH");
    else if(state.count>trustedAnchor.count){
     const prefix=trustedAnchor.count===0?ZERO:state.entries[trustedAnchor.count-1]?.hash;
     if(prefix!==trustedAnchor.tip)blockers.push("AUDIT_PREFIX_MISMATCH");
    }
   }
  }
  // Recheck residue to catch changes during the read. Not an atomic lease.
  for(const [name,code] of [
   ["audit.lock","AUDIT_WRITER_LOCK_REVIEW_REQUIRED"],
   ["audit.pending","AUDIT_PENDING_REVIEW_REQUIRED"]
  ]){
   try{await lstat(join(directory,name));blockers.push(code);}
   catch(e){if(e.code!=="ENOENT")throw e;}
  }
  const unique=Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
   version:RECOVERY_AUDIT_INTEGRITY_VERSION,
   status:unique.length?"manual-intervention-required":"ready",
   safeToResume:unique.length===0,
   blockers:unique,
   anchored:trustedAnchor!==undefined,
   audit:state?Object.freeze({count:state.count,tip:state.tip}):null
  });
 }
 return Object.freeze({version:RECOVERY_AUDIT_INTEGRITY_VERSION,assess});
}

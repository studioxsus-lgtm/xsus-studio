/**
 * Hyper XSUS Core v6.2 — read-only trusted anchor health assessment.
 * A health report is advisory, not a recovery authorization or atomic lease.
 */
import {lstat} from "node:fs/promises";
import {join} from "node:path";
export const TRUSTED_ANCHOR_HEALTH_VERSION="6.2.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function createTrustedAnchorHealth({directory,readAnchor,inspectAudit}={}){
 if(typeof directory!=="string"||!directory||
  typeof readAnchor!=="function"||typeof inspectAudit!=="function")
  throw new TypeError("Anchor directory, reader and audit inspector required.");
 async function residue(){
  const blockers=[];
  for(const [file,code] of [
   ["checkpoint.lock","ANCHOR_WRITER_LOCK_REVIEW_REQUIRED"],
   ["checkpoint.pending","ANCHOR_PENDING_REVIEW_REQUIRED"]
  ]){
   try{await lstat(join(directory,file));blockers.push(code);}
   catch(e){if(e.code!=="ENOENT")throw e;}
  }
  return blockers;
 }
 async function assess(){
  const blockers=await residue();
  let anchor=null,report=null;
  try{anchor=await readAnchor();}
  catch(e){
   if(e.code==="XSUS_CHECKPOINT_UNINITIALIZED")blockers.push("ANCHOR_UNINITIALIZED");
   else if(typeof e.code==="string"&&e.code.startsWith("XSUS_CHECKPOINT_"))
    blockers.push("ANCHOR_INTEGRITY_REVIEW_REQUIRED");
   else throw e;
  }
  if(anchor){
   try{report=await inspectAudit({trustedAnchor:anchor});}
   catch(e){
    if(typeof e.code==="string"&&(e.code.startsWith("XSUS_AUDIT_")||
      e.code.startsWith("XSUS_DURABLE_AUDIT_")))
     blockers.push("AUDIT_INTEGRITY_REVIEW_REQUIRED");
    else throw e;
   }
   if(report){
    if(report.safeToResume!==true||!Array.isArray(report.blockers)||
     !report.audit||typeof report.audit.tip!=="string"||
     !Number.isSafeInteger(report.audit.count))
     blockers.push("AUDIT_NOT_READY");
    if(Array.isArray(report.blockers))blockers.push(...report.blockers);
   }
   let reread=null;
   try{reread=await readAnchor();}
   catch(e){
    if(typeof e.code==="string"&&e.code.startsWith("XSUS_CHECKPOINT_"))
     blockers.push("ANCHOR_INTEGRITY_REVIEW_REQUIRED");
    else throw e;
   }
   if(reread&&(anchor.count!==reread.count||anchor.tip!==reread.tip))
    blockers.push("ANCHOR_CHANGED_DURING_INSPECTION");
  }
  blockers.push(...await residue());
  const unique=Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
   version:TRUSTED_ANCHOR_HEALTH_VERSION,
   status:unique.length?"manual-intervention-required":"ready",
   safeToResume:unique.length===0,
   blockers:unique,
   anchor:anchor?Object.freeze({count:anchor.count,tip:anchor.tip}):null,
   audit:report?.audit?Object.freeze({...report.audit}):null
  });
 }
 return Object.freeze({version:TRUSTED_ANCHOR_HEALTH_VERSION,assess});
}

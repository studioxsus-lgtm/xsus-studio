/**
 * Hyper XSUS Core v3.7 — fail-closed archive crash and rollback assessment.
 * Requires an independently trusted checkpoint; never repairs archive or lock.
 */
import {lstat,readdir} from "node:fs/promises";
import {join} from "node:path";
export const INCIDENT_CRASH_GUARD_VERSION="3.7.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const hex=/^[a-f0-9]{64}$/;
export function createIncidentCrashGuard({directory,archive,checkpoint}={}){
 if(typeof directory!=="string"||!archive||typeof archive.verify!=="function"||
 !checkpoint||typeof checkpoint.read!=="function")
 throw new TypeError("Archive directory, verifier and independent checkpoint required.");
 async function inspect(){
  const trusted=await checkpoint.read();
  if(!trusted||!valid(trusted.count)||typeof trusted.tip!=="string"||!hex.test(trusted.tip))
   throw fail("XSUS_INCIDENT_CHECKPOINT_INVALID","Invalid trusted archive checkpoint.");
  let lock="absent",unsafe=false;
  try{
   const stat=await lstat(join(directory,"writer.lock"));
   if(!stat.isDirectory()||stat.isSymbolicLink())unsafe=true;
   else lock="present";
  }catch(e){if(e.code!=="ENOENT")throw e;}
  if(unsafe)throw fail("XSUS_INCIDENT_LOCK_UNSAFE","Unsafe incident writer lock.");
  let files=[];
  try{files=await readdir(directory);}
  catch(e){if(e.code!=="ENOENT")throw e;}
  const suspicious=files.filter(f=>f.startsWith("incident-")&&!/^incident-\d{16}\.json$/.test(f));
  if(suspicious.length)throw fail("XSUS_INCIDENT_ARCHIVE_UNSAFE","Unexpected incident artifact.");
  const verified=await archive.verify();
  if(!verified||!valid(verified.count)||typeof verified.tip!=="string"||!hex.test(verified.tip)||
   !Array.isArray(verified.entries)||verified.entries.length!==verified.count)
   throw fail("XSUS_INCIDENT_ARCHIVE_INVALID","Invalid archive verification result.");
  const checkpointAfter=await checkpoint.read();
  if(checkpointAfter.count!==trusted.count||checkpointAfter.tip!==trusted.tip)
   throw fail("XSUS_INCIDENT_CHECKPOINT_CHANGED","Checkpoint changed during inspection.");
  const second=await archive.verify();
  if(second.count!==verified.count||second.tip!==verified.tip)
   throw fail("XSUS_INCIDENT_ARCHIVE_CHANGED","Archive changed during inspection.");
  const rollback=verified.count<trusted.count||
   verified.count===trusted.count&&verified.tip!==trusted.tip;
  const unanchored=verified.count>trusted.count;
  const blockers=[];
  if(lock==="present")blockers.push("WRITER_LOCK_REVIEW_REQUIRED");
  if(rollback)blockers.push("ARCHIVE_ROLLBACK_OR_FORK");
  if(unanchored)blockers.push("UNANCHORED_ARCHIVE_TAIL");
  return Object.freeze({
   version:INCIDENT_CRASH_GUARD_VERSION,
   status:blockers.length?"manual-intervention-required":"consistent",
   safeToResume:blockers.length===0,
   lock,archiveCount:verified.count,trustedCount:trusted.count,
   archiveTip:verified.tip,trustedTip:trusted.tip,
   blockers:Object.freeze(blockers)
  });
 }
 return Object.freeze({version:INCIDENT_CRASH_GUARD_VERSION,inspect});
}

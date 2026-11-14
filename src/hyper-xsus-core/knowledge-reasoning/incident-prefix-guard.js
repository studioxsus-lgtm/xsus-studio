/**
 * Hyper XSUS Core v3.8 — independent prefix-authentication guard.
 * A longer archive is NOT evidence of a valid trusted prefix by itself.
 * This is read-only: no automatic checkpoint promotion or lock removal.
 */
import {lstat,readdir} from "node:fs/promises";
import {join,isAbsolute} from "node:path";
export const INCIDENT_PREFIX_GUARD_VERSION="3.8.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const hex=/^[a-f0-9]{64}$/;
export function createIncidentPrefixGuard({directory,archive,checkpoint}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||
 !archive||typeof archive.verify!=="function"||
 !checkpoint||typeof checkpoint.read!=="function")
 throw new TypeError("Absolute directory, signed archive and independent checkpoint required.");
 async function inspect(){
  const before=await checkpoint.read();
  if(!before||!valid(before.count)||typeof before.tip!=="string"||!hex.test(before.tip)||
   (before.count===0&&before.tip!=="0".repeat(64)))
   throw fail("XSUS_INCIDENT_CHECKPOINT_INVALID","Invalid trusted checkpoint.");
  let locked=false;
  try{
   const st=await lstat(join(directory,"writer.lock"));
   if(!st.isDirectory()||st.isSymbolicLink())
    throw fail("XSUS_INCIDENT_LOCK_UNSAFE","Unsafe writer lock.");
   locked=true;
  }catch(e){if(e.code!=="ENOENT")throw e;}
  let files=[];
  try{files=await readdir(directory);}catch(e){if(e.code!=="ENOENT")throw e;}
  if(files.some(f=>f.startsWith("incident-")&&!/^incident-\d{16}\.json$/.test(f)))
   throw fail("XSUS_INCIDENT_ARCHIVE_UNSAFE","Unrecognized incident artifact.");
  const first=await archive.verify();
  if(!first||!valid(first.count)||!hex.test(first.tip)||
   !Array.isArray(first.entries)||first.entries.length!==first.count||
   first.entries.some((entry,i)=>entry?.sequence!==i+1||typeof entry.signature!=="string"||!hex.test(entry.signature))||
   (first.count===0&&first.tip!=="0".repeat(64))||
   (first.count>0&&first.entries.at(-1).signature!==first.tip))
   throw fail("XSUS_INCIDENT_ARCHIVE_INVALID","Malformed signed archive verification.");
  const trustedPrefix=before.count===0?"0".repeat(64):
   first.entries[before.count-1]?.signature;
  const rollback=first.count<before.count;
  const fork=!rollback&&trustedPrefix!==before.tip;
  const tail=!rollback&&!fork&&first.count>before.count;
  const after=await checkpoint.read();
  if(!after||after.count!==before.count||after.tip!==before.tip)
   throw fail("XSUS_INCIDENT_CHECKPOINT_CHANGED","Trusted checkpoint changed.");
  const second=await archive.verify();
  if(second.count!==first.count||second.tip!==first.tip||
   !Array.isArray(second.entries)||second.entries.length!==first.entries.length||
   second.entries.some((entry,i)=>entry.signature!==first.entries[i].signature))
   throw fail("XSUS_INCIDENT_ARCHIVE_CHANGED","Archive changed during inspection.");
  const blockers=[];
  if(locked)blockers.push("WRITER_LOCK_REVIEW_REQUIRED");
  if(rollback)blockers.push("ARCHIVE_ROLLBACK");
  if(fork)blockers.push("TRUSTED_PREFIX_FORK");
  if(tail)blockers.push("UNANCHORED_ARCHIVE_TAIL");
  return Object.freeze({
   version:INCIDENT_PREFIX_GUARD_VERSION,
   status:blockers.length?"manual-intervention-required":"consistent",
   safeToResume:blockers.length===0,
   archiveCount:first.count,trustedCount:before.count,
   archiveTip:first.tip,trustedTip:before.tip,
   blockers:Object.freeze(blockers)
  });
 }
 return Object.freeze({version:INCIDENT_PREFIX_GUARD_VERSION,inspect});
}

/**
 * Hyper XSUS Core v4.4 — read-only filesystem residue assessment.
 * This is an advisory additional gate; it does not delete, repair or authorize.
 */
import {lstat,readdir} from "node:fs/promises";
import {join,isAbsolute,resolve} from "node:path";
export const RECOVERY_READINESS_VERSION="4.4.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
async function directoryState(path){
 try{const stat=await lstat(path);return stat.isDirectory()&&!stat.isSymbolicLink()?"directory":"unsafe";}
 catch(e){if(e.code==="ENOENT")return "absent";throw e;}
}
async function fileState(path){
 try{const stat=await lstat(path);return stat.isFile()&&!stat.isSymbolicLink()?"file":"unsafe";}
 catch(e){if(e.code==="ENOENT")return "absent";throw e;}
}
export function createRecoveryReadinessGuard({archiveDirectory,checkpointDirectory,inspect}={}){
 if(typeof archiveDirectory!=="string"||!isAbsolute(archiveDirectory)||
 typeof checkpointDirectory!=="string"||!isAbsolute(checkpointDirectory)||
 resolve(archiveDirectory)===resolve(checkpointDirectory)||typeof inspect!=="function")
 throw new TypeError("Separate absolute directories and integration inspection required.");
 async function assess(){
  const [archiveLock,checkpointLock,pending,archiveDir,checkpointDir]=await Promise.all([
   directoryState(join(archiveDirectory,"writer.lock")),
   directoryState(join(checkpointDirectory,"checkpoint.lock")),
   fileState(join(checkpointDirectory,"checkpoint.pending")),
   directoryState(archiveDirectory),directoryState(checkpointDirectory)
  ]);
  if(archiveDir==="unsafe"||checkpointDir==="unsafe"||
   archiveLock==="unsafe"||checkpointLock==="unsafe"||pending==="unsafe")
   throw fail("XSUS_RECOVERY_ARTIFACT_UNSAFE","Unsafe filesystem artifact.");
  const blockers=[];
  if(archiveLock==="directory")blockers.push("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED");
  if(checkpointLock==="directory")blockers.push("CHECKPOINT_WRITER_LOCK_REVIEW_REQUIRED");
  if(pending==="file")blockers.push("CHECKPOINT_PENDING_REVIEW_REQUIRED");
  const core=await inspect();
  if(!core||!Array.isArray(core.blockers)||typeof core.safeToResume!=="boolean")
   throw fail("XSUS_RECOVERY_ASSESSMENT_INVALID","Invalid core recovery inspection.");
  blockers.push(...core.blockers);
  // Second filesystem read prevents a newly created residue from being missed.
  const after=await Promise.all([
   directoryState(join(archiveDirectory,"writer.lock")),
   directoryState(join(checkpointDirectory,"checkpoint.lock")),
   fileState(join(checkpointDirectory,"checkpoint.pending"))
  ]);
  if(after[0]!==archiveLock||after[1]!==checkpointLock||after[2]!==pending)
   throw fail("XSUS_RECOVERY_ARTIFACT_CHANGED","Recovery artifacts changed during inspection.");
  return Object.freeze({
   version:RECOVERY_READINESS_VERSION,
   status:blockers.length||!core.safeToResume?"manual-intervention-required":"consistent",
   safeToResume:blockers.length===0&&core.safeToResume,
   blockers:Object.freeze([...new Set(blockers)]),
   core
  });
 }
 return Object.freeze({version:RECOVERY_READINESS_VERSION,assess});
}

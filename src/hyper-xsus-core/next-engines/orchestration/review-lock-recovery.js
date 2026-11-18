import {lstat,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {string} from "../contracts.js";

/**
 * Read-only, fail-closed inspection of a journal's filesystem lock.
 * Does not infer liveness from a PID, steal a lock, or authorize deletion.
 * A missing lock does not establish that an interrupted write committed.
 */
export async function inspectReviewLock({filePath}={}){
 string(filePath,"filePath");
 const lockPath=`${filePath}.lock`;
 let stat;
 try{stat=await lstat(lockPath);}
 catch(error){
  if(error?.code==="ENOENT")return Object.freeze({
   state:"not_observed",lockPresent:false,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,nextAction:"verify_journal"
  });
  throw error;
 }
 if(!stat.isFile()||stat.isSymbolicLink())return Object.freeze({
  state:"unsafe_lock",lockPresent:true,recoveryAuthorized:false,
  deletionAuthorized:false,retrySafe:false,nextAction:"manual_investigation"
 });
 let owner;
 try{
  const raw=await readFile(lockPath,"utf8");
  if(Buffer.byteLength(raw,"utf8")>4096)throw Error("Oversized lock metadata");
  owner=JSON.parse(raw);
 }catch{return Object.freeze({
  state:"unverifiable_lock",lockPresent:true,recoveryAuthorized:false,
  deletionAuthorized:false,retrySafe:false,nextAction:"manual_investigation"
 });}
 if(!owner||Array.isArray(owner)||typeof owner!=="object"||
    !Number.isSafeInteger(owner.pid)||owner.pid<=0||
    typeof owner.token!=="string"||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner.token))
  return Object.freeze({state:"unverifiable_lock",lockPresent:true,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   nextAction:"manual_investigation"});
 let after;
 try{after=await lstat(lockPath);}
 catch(error){
  if(error?.code==="ENOENT")return Object.freeze({state:"changed_during_inspection",lockPresent:false,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,nextAction:"manual_investigation"});
  throw error;
 }
 if(!after.isFile()||after.isSymbolicLink()||stat.dev!==after.dev||stat.ino!==after.ino||
    stat.size!==after.size||stat.mtimeMs!==after.mtimeMs||stat.ctimeMs!==after.ctimeMs)
  return Object.freeze({state:"changed_during_inspection",lockPresent:true,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,nextAction:"manual_investigation"});
 // A digest is for comparison only: it does not prove ownership or liveness.
 // Do not expose the raw lock token in diagnostic results.
 const ownerFingerprint=createHash("sha256").update(JSON.stringify({
  pid:owner.pid,token:owner.token,dev:String(stat.dev),ino:String(stat.ino)
 })).digest("hex");
 return Object.freeze({state:"lock_observed",lockPresent:true,
  ownerPid:owner.pid,ownerFingerprint,recoveryAuthorized:false,deletionAuthorized:false,
  retrySafe:false,nextAction:"manual_investigation"});
}

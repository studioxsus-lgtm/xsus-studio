import {lstat,readFile} from "node:fs/promises";
import {EngineContractError,string} from "../contracts.js";

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
 return Object.freeze({state:"lock_observed",lockPresent:true,
  ownerPid:owner.pid,recoveryAuthorized:false,deletionAuthorized:false,
  retrySafe:false,nextAction:"manual_investigation"});
}

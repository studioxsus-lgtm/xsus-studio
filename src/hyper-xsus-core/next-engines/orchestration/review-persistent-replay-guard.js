import {readFile,rename,lstat,open,mkdir,readdir} from "node:fs/promises";
import {dirname,basename} from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {withExclusiveFileLock} from "../../knowledge-graph/integration/exclusive-file-lock.js";
import {createReviewAuditKeyRotationGuard} from "./review-audit-key-rotation.js";

const blocked=code=>Object.freeze({state:"authentication_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const identity=receipt=>{
 const id=Object.getOwnPropertyDescriptor(receipt,"keyId");
 const tag=Object.getOwnPropertyDescriptor(receipt,"authenticationTag");
 if(!id||!("value" in id)||!tag||!("value" in tag)||
  typeof id.value!=="string"||typeof tag.value!=="string")
  throw Error("Unsafe receipt");
 return createHash("sha256").update(JSON.stringify([id.value,tag.value])).digest("hex");
};
const registryDigest=ids=>createHash("sha256").update(JSON.stringify([1,ids])).digest("hex");
async function assertNoInterruptedWrites(filePath){
 const prefix=basename(filePath)+".";
 const names=await readdir(dirname(filePath));
 if(names.some(name=>name.startsWith(prefix)&&name.endsWith(".tmp")))
  throw Error("Unresolved replay registry write");
}
async function readRegistry(filePath,maxReceipts){
 try{
  const stat=await lstat(filePath);
  if(!stat.isFile()||stat.size>maxReceipts*80+128)throw Error("Unsafe registry");
  const bytes=await readFile(filePath,"utf8");
  const after=await lstat(filePath);
  if(!after.isFile()||stat.dev!==after.dev||stat.ino!==after.ino||
   stat.size!==after.size||stat.mtimeMs!==after.mtimeMs)
   throw Error("Replay registry changed while reading");
  const data=JSON.parse(bytes);
  if(data?.version!==1||!Array.isArray(data.ids)||data.ids.length>maxReceipts||
   data.ids.some(x=>typeof x!=="string"||!/^[a-f0-9]{64}$/.test(x))||
   new Set(data.ids).size!==data.ids.length||
   data.digest!==registryDigest(data.ids))throw Error("Invalid registry");
  return data.ids;
 }catch(error){
  if(error?.code==="ENOENT")return [];
  throw error;
 }
}
async function persist(filePath,ids){
 await mkdir(dirname(filePath),{recursive:true});
 const temporary=filePath+"."+randomUUID()+".tmp";
 let handle;
 try{
  handle=await open(temporary,"wx",0o600);
  await handle.writeFile(JSON.stringify({version:1,ids,digest:registryDigest(ids)}),"utf8");
  await handle.sync();
  await handle.close();handle=null;
  await rename(temporary,filePath);
  const directory=await open(dirname(filePath),"r");
  try{await directory.sync();}finally{await directory.close();}
 }finally{
  if(handle)await handle.close();
  // A failed write intentionally leaves its temp file for manual investigation.
 }
}
/**
 * Phase 61-62: local-filesystem replay tracking with interruption detection,\n * digest-checked records and pathname-change checks under exclusive lock.\n * Digest is corruption detection, NOT an authentication or rollback anchor.
 * The lock is never stolen; failure blocks the receipt. Requires trusted
 * storage and durable backups; not a distributed consensus mechanism.
 */
export function createPersistentReviewReplayGuard({
 filePath,keys,activeKeyId,maxReceipts=1024
}={}){
 if(typeof filePath!=="string"||!filePath.trim()||
  !Number.isSafeInteger(maxReceipts)||maxReceipts<1||maxReceipts>100000)
  throw new EngineContractError("INVALID_INPUT","Invalid persistent replay configuration");
 // Validate the key ring once; each verification uses a fresh in-memory guard.
 createReviewAuditKeyRotationGuard({keys,activeKeyId,maxReceipts});
 async function verify({observations,receipt,maxObservations}={}){
  try{
   return await withExclusiveFileLock(filePath,async()=>{
    await assertNoInterruptedWrites(filePath);
    const ids=await readRegistry(filePath,maxReceipts);
    const local=createReviewAuditKeyRotationGuard({keys,activeKeyId,maxReceipts});
    const result=local.verify({observations,receipt,maxObservations});
    if(result.state!=="authenticated_for_manual_review")return result;
    const id=identity(receipt);
    if(ids.includes(id))return blocked("RECEIPT_REPLAYED");
    if(ids.length>=maxReceipts)return blocked("REPLAY_REGISTRY_FULL");
    await persist(filePath,[...ids,id]);
    return result;
   });
  }catch{return blocked("PERSISTENT_REPLAY_UNVERIFIED");}
 }
 return Object.freeze({verify});
}

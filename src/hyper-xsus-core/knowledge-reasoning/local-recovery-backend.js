/**
 * Hyper XSUS Core v3.3 — single-host, fail-closed durable CAS adapter.
 * NOT a multi-host distributed consensus service. Never auto-break stale locks.
 * A trusted operator must provision and protect this directory.
 */
import {createHmac,timingSafeEqual,randomUUID} from "node:crypto";
import {mkdir,open,readFile,rename,rm,rmdir} from "node:fs/promises";
import {constants} from "node:fs";
import {join,isAbsolute,resolve} from "node:path";
export const LOCAL_RECOVERY_BACKEND_VERSION="3.3.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
export function createLocalRecoveryBackend({directory,key,keyId}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||resolve(directory)!==directory||
 directory.includes("\0")||!(typeof key==="string"||Buffer.isBuffer(key))||
 Buffer.byteLength(key)<32||typeof keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(keyId))
 throw new TypeError("Absolute directory, 32+ byte key and valid keyId required.");
 const secret=Buffer.from(key),stateFile=join(directory,"state.json"),
 lockDir=join(directory,"lease.lock"),lockFile=join(lockDir,"token");
 let owned=null;
 const sign=(mark,inventory)=>createHmac("sha256",secret)
  .update(JSON.stringify(["3.3.0",keyId,mark,inventory])).digest("hex");
 const seal=(mark,inventory)=>({version:"3.3.0",keyId,mark,inventory,signature:sign(mark,inventory)});
 async function syncDir(path){
  const handle=await open(path,constants.O_RDONLY);
  try{await handle.sync();}finally{await handle.close();}
 }
 async function writeNew(path,data){
  const h=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{await h.writeFile(data);await h.sync();}finally{await h.close();}
 }
 async function state(){
  let data;
  try{data=JSON.parse(await readFile(stateFile,"utf8"));}
  catch(e){if(e.code==="ENOENT")throw fail("XSUS_LOCAL_STATE_MISSING","Trusted state not initialized.");throw e;}
  if(!data||Object.keys(data).sort().join(",")!=="inventory,keyId,mark,signature,version"||
   data.version!=="3.3.0"||data.keyId!==keyId||!valid(data.mark)||
   !Array.isArray(data.inventory)||data.inventory.some(n=>!valid(n)||n>data.mark)||
   data.inventory.some((n,i)=>i>0&&n<=data.inventory[i-1])||
   typeof data.signature!=="string"||!/^[a-f0-9]{64}$/.test(data.signature))
   throw fail("XSUS_LOCAL_STATE_INVALID","Malformed trusted state.");
  if(!timingSafeEqual(Buffer.from(sign(data.mark,data.inventory),"hex"),Buffer.from(data.signature,"hex")))
   throw fail("XSUS_LOCAL_STATE_SIGNATURE","Trusted state signature mismatch.");
  return data;
 }
 async function initialize(initial=0){
  if(!valid(initial))throw new TypeError("Invalid initial sequence.");
  await mkdir(directory,{recursive:true,mode:0o700});
  await writeNew(stateFile,JSON.stringify(seal(initial,[])));
  await syncDir(directory);
 }
 const highWater={
  read:async()=>(await state()).mark,
  advance:async(expected,next,token)=>{
   if(!owned||token!==owned||!valid(expected)||!valid(next)||next<=expected)
    throw fail("XSUS_HIGH_WATER_CONFLICT","Invalid fence or CAS.");
   let current;
   try{current=await readFile(lockFile,"utf8");}
   catch{throw fail("XSUS_AUDIT_FENCE_INVALID","Lock missing.");}
   if(current!==token)throw fail("XSUS_AUDIT_FENCE_INVALID","Fence no longer owns lock.");
   const before=await state();
   if(before.mark!==expected)throw fail("XSUS_HIGH_WATER_CONFLICT","CAS mismatch.");
   const inventory=[...before.inventory,next];
   const tmp=join(directory,`state-${randomUUID()}.tmp`);
   try{
    await writeNew(tmp,JSON.stringify(seal(next,inventory)));
    // No lock stealing is supported. Recheck ownership before atomic rename.
    if(await readFile(lockFile,"utf8")!==token)
     throw fail("XSUS_AUDIT_FENCE_INVALID","Fence lost before commit.");
    await rename(tmp,stateFile);
    await syncDir(directory);
   }finally{await rm(tmp,{force:true});}
  }
 };
 const expected={read:async()=>[...(await state()).inventory]};
 const lease={
  acquire:async()=>{
   if(owned)throw fail("XSUS_AUDIT_FENCE_BUSY","Already owns lock.");
   try{await mkdir(lockDir);}
   catch(e){if(e.code==="EEXIST")throw fail("XSUS_AUDIT_FENCE_BUSY","Lease held or stale; manual recovery required.");throw e;}
   const token=randomUUID();
   try{await writeNew(lockFile,token);await syncDir(lockDir);await syncDir(directory);owned=token;return token;}
   catch(e){ // Never auto-remove an ambiguous lock after a durability failure.
    throw e;
   }
  },
  release:async token=>{
   if(!owned||token!==owned)throw fail("XSUS_AUDIT_FENCE_INVALID","Not lock owner.");
   if(await readFile(lockFile,"utf8")!==token)
    throw fail("XSUS_AUDIT_FENCE_INVALID","Lock ownership changed.");
   // Keep stale lock on filesystem failure; do not allow another writer.
   await rm(lockFile);
   await rmdir(lockDir);
   await syncDir(directory);
   owned=null;
  }
 };
 return Object.freeze({version:LOCAL_RECOVERY_BACKEND_VERSION,initialize,highWater,expected,lease});
}

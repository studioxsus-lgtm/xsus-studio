/**
 * Hyper XSUS Core v4.0 — single-host durable checkpoint adapter.
 * NOT an external rollback anchor. Requires a separately protected directory/key.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
import {mkdir,open,readFile,rename,rmdir,lstat} from "node:fs/promises";
import {constants} from "node:fs";
import {join,isAbsolute} from "node:path";
export const DURABLE_CHECKPOINT_VERSION="4.0.0";
const zero="0".repeat(64),hex=/^[a-f0-9]{64}$/;
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=x=>x&&Number.isSafeInteger(x.count)&&x.count>=0&&
 typeof x.tip==="string"&&hex.test(x.tip)&&(x.count!==0||x.tip===zero);
export function createDurableIncidentCheckpoint({directory,key,keyId}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||
 !(typeof key==="string"||Buffer.isBuffer(key))||Buffer.byteLength(key)<32||
 typeof keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(keyId))
 throw new TypeError("Absolute directory, 32+ byte signing key and keyId required.");
 const secret=Buffer.from(key),file=join(directory,"checkpoint.json"),lock=join(directory,"checkpoint.lock");
 const sign=(count,tip)=>createHmac("sha256",secret).update(JSON.stringify(["xsus-checkpoint-v4",keyId,count,tip])).digest("hex");
 const syncDir=async()=>{const h=await open(directory,constants.O_RDONLY);try{await h.sync();}finally{await h.close();}};
 async function read(){
  let raw;
  try{raw=await readFile(file,"utf8");}
  catch(e){if(e.code==="ENOENT")throw fail("XSUS_CHECKPOINT_UNINITIALIZED","Trusted checkpoint not initialized.");throw e;}
  let obj;
  try{obj=JSON.parse(raw);}catch{throw fail("XSUS_CHECKPOINT_CORRUPT","Malformed checkpoint.");}
  if(!obj||Object.keys(obj).sort().join(",")!=="count,keyId,signature,tip,version"||
   obj.version!==DURABLE_CHECKPOINT_VERSION||obj.keyId!==keyId||!valid(obj)||
   typeof obj.signature!=="string"||!hex.test(obj.signature))
   throw fail("XSUS_CHECKPOINT_CORRUPT","Invalid checkpoint structure.");
  const expected=sign(obj.count,obj.tip);
  if(!timingSafeEqual(Buffer.from(obj.signature,"hex"),Buffer.from(expected,"hex")))
   throw fail("XSUS_CHECKPOINT_SIGNATURE","Checkpoint authentication failed.");
  return Object.freeze({count:obj.count,tip:obj.tip});
 }
 async function checkPending(){
  try{await lstat(join(directory,"checkpoint.pending"));}
  catch(e){if(e.code==="ENOENT")return;throw e;}
  throw fail("XSUS_CHECKPOINT_PENDING","Interrupted checkpoint write requires manual review.");
 }
 async function acquire(){
  await mkdir(directory,{recursive:true,mode:0o700});
  try{await mkdir(lock, {mode:0o700});}
  catch(e){if(e.code==="EEXIST")throw fail("XSUS_CHECKPOINT_LOCKED","Concurrent or interrupted checkpoint writer.");throw e;}
 }
 async function release(){await rmdir(lock);}
 async function persist(mark,{exclusive=false}={}){
  const body=JSON.stringify({version:DURABLE_CHECKPOINT_VERSION,keyId,count:mark.count,tip:mark.tip,signature:sign(mark.count,mark.tip)});
  const tmp=join(directory,"checkpoint.pending");
  let h;
  try{
   h=await open(tmp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
   await h.writeFile(body);await h.sync();
  }finally{if(h)await h.close();}
  if(exclusive){
   // No overwrite when initializing; atomic hard link publishes only if absent.
   const {link,unlink}=await import("node:fs/promises");
   await link(tmp,file);await unlink(tmp);
  }else await rename(tmp,file);
  await syncDir();
 }
 async function initialize(){
  await acquire();
  try{
   // Preserve idempotent initialization of an existing authenticated checkpoint.
   // A pending artifact still blocks creation of a missing checkpoint.
   try{await read();return false;}
   catch(e){if(e.code!=="XSUS_CHECKPOINT_UNINITIALIZED")throw e;}
   await checkPending();
   await persist({count:0,tip:zero},{exclusive:true});
   return true;
  }finally{await release();}
 }
 async function advance(previous,next){
  if(!valid(previous)||!valid(next)||next.count<=previous.count)
   throw fail("XSUS_CHECKPOINT_INVALID_TRANSITION","Checkpoint must advance monotonically.");
  await acquire();
  try{
   await checkPending();
   const current=await read();
   if(current.count!==previous.count||current.tip!==previous.tip)
    throw fail("XSUS_CHECKPOINT_CAS_CONFLICT","Checkpoint changed.");
   await persist(next);
   const confirmed=await read();
   if(confirmed.count!==next.count||confirmed.tip!==next.tip)
    throw fail("XSUS_CHECKPOINT_UNCERTAIN","Checkpoint persistence unconfirmed.");
   return Object.freeze({...confirmed});
  }finally{await release();}
 }
 return Object.freeze({version:DURABLE_CHECKPOINT_VERSION,initialize,read,advance});
}

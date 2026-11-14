/**
 * Hyper XSUS Core v5.7 — authenticated single-host durable audit snapshots.
 * Explicitly single-writer; stale lock/pending artifacts require manual review.
 * No rollback protection without an external trusted anchor.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
import {mkdir,open,readFile,rename,rmdir} from "node:fs/promises";
import {constants} from "node:fs";
import {join,isAbsolute} from "node:path";
export const DURABLE_RECOVERY_AUDIT_VERSION="5.7.0";
const ZERO="0".repeat(64),HEX=/^[a-f0-9]{64}$/;
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function createDurableRecoveryAudit({directory,key,keyId,maxEntries=1000}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||
  !(typeof key==="string"||Buffer.isBuffer(key))||Buffer.byteLength(key)<32||
  typeof keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(keyId)||
  !Number.isSafeInteger(maxEntries)||maxEntries<1)
  throw new TypeError("Absolute directory, 32+ byte key, keyId and positive capacity required.");
 const secret=Buffer.from(key),file=join(directory,"audit.json"),
  pending=join(directory,"audit.pending"),lock=join(directory,"audit.lock");
 const sign=(entries,tip)=>createHmac("sha256",secret)
  .update(JSON.stringify(["xsus-recovery-audit-v57",keyId,entries,tip])).digest("hex");
 const digest=body=>createHmac("sha256",secret)
  .update(JSON.stringify(["xsus-recovery-audit-entry-v57",keyId,body])).digest("hex");
 const syncDir=async()=>{const h=await open(directory,constants.O_RDONLY);try{await h.sync();}finally{await h.close();}};
 const validEntry=(entry,index,prior)=>{
  if(!entry||typeof entry!=="object"||Array.isArray(entry)||
   Object.keys(entry).sort().join(",")!=="hash,payload,previousHash,sequence"||
   entry.sequence!==index+1||entry.previousHash!==prior||
   typeof entry.hash!=="string"||!HEX.test(entry.hash)||
   !entry.payload||typeof entry.payload!=="object"||Array.isArray(entry.payload))
   throw fail("XSUS_DURABLE_AUDIT_CORRUPT","Malformed audit entry.");
  if(!timingSafeEqual(Buffer.from(entry.hash,"hex"),Buffer.from(digest({
   sequence:entry.sequence,previousHash:entry.previousHash,payload:entry.payload
  }),"hex")))
   throw fail("XSUS_DURABLE_AUDIT_INTEGRITY","Audit entry authentication failed.");
  return entry.hash;
 };
 async function read(){
  let raw;
  try{raw=await readFile(file,"utf8");}
  catch(e){if(e.code==="ENOENT")throw fail("XSUS_DURABLE_AUDIT_UNINITIALIZED","Audit not initialized.");throw e;}
  let obj;
  try{obj=JSON.parse(raw);}catch{throw fail("XSUS_DURABLE_AUDIT_CORRUPT","Malformed audit snapshot.");}
  if(!obj||typeof obj!=="object"||Array.isArray(obj)||
   Object.keys(obj).sort().join(",")!=="entries,keyId,signature,tip,version"||
   obj.version!==DURABLE_RECOVERY_AUDIT_VERSION||obj.keyId!==keyId||
   !Array.isArray(obj.entries)||obj.entries.length>maxEntries||
   !HEX.test(obj.tip)||!HEX.test(obj.signature))
   throw fail("XSUS_DURABLE_AUDIT_CORRUPT","Invalid audit snapshot structure.");
  let prior=ZERO;
  for(let i=0;i<obj.entries.length;i++)prior=validEntry(obj.entries[i],i,prior);
  if(obj.tip!==prior)throw fail("XSUS_DURABLE_AUDIT_INTEGRITY","Audit tip mismatch.");
  const expected=sign(obj.entries,obj.tip);
  if(!timingSafeEqual(Buffer.from(obj.signature,"hex"),Buffer.from(expected,"hex")))
   throw fail("XSUS_DURABLE_AUDIT_SIGNATURE","Audit snapshot authentication failed.");
  return Object.freeze({
   version:DURABLE_RECOVERY_AUDIT_VERSION,count:obj.entries.length,tip:obj.tip,
   entries:Object.freeze(obj.entries.map(e=>Object.freeze({
    sequence:e.sequence,previousHash:e.previousHash,hash:e.hash,
    payload:JSON.parse(JSON.stringify(e.payload))
   })))
  });
 }
 async function acquire(){
  await mkdir(directory,{recursive:true,mode:0o700});
  try{await mkdir(lock,{mode:0o700});}
  catch(e){if(e.code==="EEXIST")throw fail("XSUS_DURABLE_AUDIT_LOCKED","Audit writer lock requires review.");throw e;}
 }
 async function release(){await rmdir(lock);}
 async function checkPending(){
  try{const h=await open(pending,constants.O_RDONLY|constants.O_NOFOLLOW);await h.close();}
  catch(e){if(e.code==="ENOENT")return;if(e.code==="ELOOP")throw fail("XSUS_DURABLE_AUDIT_PENDING","Unsafe pending artifact.");throw e;}
  throw fail("XSUS_DURABLE_AUDIT_PENDING","Pending audit artifact requires review.");
 }
 async function persist(entries,tip,{exclusive=false}={}){
  const body=JSON.stringify({version:DURABLE_RECOVERY_AUDIT_VERSION,keyId,entries,tip,signature:sign(entries,tip)});
  const h=await open(pending,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{await h.writeFile(body);await h.sync();}finally{await h.close();}
  if(exclusive){
   const {link,unlink}=await import("node:fs/promises");
   await link(pending,file);await unlink(pending);
  }else await rename(pending,file);
  await syncDir();
 }
 async function initialize(){
  await acquire();
  try{
   await checkPending();
   try{await read();return false;}
   catch(e){if(e.code!=="XSUS_DURABLE_AUDIT_UNINITIALIZED")throw e;}
   await persist([],ZERO,{exclusive:true});return true;
  }finally{await release();}
 }
 async function append(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))
   throw fail("XSUS_DURABLE_AUDIT_INVALID","Audit payload must be an object.");
  // Snapshot JSON before locking to avoid retaining mutable caller references.
  let copy;
  try{copy=JSON.parse(JSON.stringify(payload));}
  catch{throw fail("XSUS_DURABLE_AUDIT_INVALID","Audit payload must be JSON serializable.");}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))
   throw fail("XSUS_DURABLE_AUDIT_INVALID","Invalid audit payload.");
  await acquire();
  try{
   await checkPending();
   const current=await read();
   if(current.count>=maxEntries)throw fail("XSUS_DURABLE_AUDIT_FULL","Audit capacity reached.");
   const entryBody={sequence:current.count+1,previousHash:current.tip,payload:copy};
   const entry={...entryBody,hash:digest(entryBody)};
   const entries=[...current.entries.map(e=>({
    sequence:e.sequence,previousHash:e.previousHash,payload:e.payload,hash:e.hash
   })),entry];
   await persist(entries,entry.hash);
   const confirmed=await read();
   if(confirmed.tip!==entry.hash||confirmed.count!==entries.length)
    throw fail("XSUS_DURABLE_AUDIT_UNCERTAIN","Audit write unconfirmed.");
   return confirmed.entries.at(-1);
  }finally{await release();}
 }
 return Object.freeze({version:DURABLE_RECOVERY_AUDIT_VERSION,initialize,read,append});
}

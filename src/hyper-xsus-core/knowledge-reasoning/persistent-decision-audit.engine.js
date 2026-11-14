/**
 * Hyper XSUS Core — Persistent Decision Audit v0.8.0.
 * Node-only atomic snapshot persistence. Fail closed on malformed journals.
 * No automatic recovery from unverified temp files.
 */
import {readFile,writeFile,rename,open,mkdir,unlink} from "node:fs/promises";
import {dirname,basename,join} from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {constants} from "node:fs";
import {createKnowledgeDecisionAudit} from "./knowledge-decision-audit.engine.js";
import {createAuditFilesystemGuard} from "./audit-filesystem-guard.js";
export const PERSISTENT_DECISION_AUDIT_VERSION="0.8.0";
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const digest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const count=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000;
function validate(doc,maxEntries){
 if(!plain(doc)||doc.version!==PERSISTENT_DECISION_AUDIT_VERSION||
  !Array.isArray(doc.entries)||doc.entries.length>maxEntries||
  !(doc.anchorHash==="GENESIS"||digest(doc.anchorHash))||
  !Number.isSafeInteger(doc.lastSequence)||doc.lastSequence<0)
  throw new TypeError("Invalid persistent audit journal.");
 if(Object.keys(doc).sort().join(",")!==
  "anchorHash,entries,lastSequence,version")
  throw new TypeError("Unexpected journal fields.");
 let prev=doc.anchorHash,seq=null;
 for(const e of doc.entries){
  if(!plain(e)||Object.keys(e).sort().join(",")!==
   "contradictionDigest,decisionDigest,evidenceCount,hash,previousHash,sequence,status,summary"||
   !Number.isSafeInteger(e.sequence)||e.sequence<1||
   (seq!==null&&e.sequence!==seq+1)||
   e.previousHash!==prev||!digest(e.hash)||
   !["reviewed","explicit-conflicts","incomplete-review"].includes(e.status)||
   !count(e.evidenceCount)||!plain(e.summary)||
   Object.keys(e.summary).sort().join(",")!=="blocked,eligible,needsReview"||
   !["eligible","needsReview","blocked"].every(k=>count(e.summary[k]))||
   !digest(e.decisionDigest)||!digest(e.contradictionDigest))
   throw new TypeError("Invalid audit entry.");
  const {hash:stored,...payload}=e;
  if(hash(payload)!==stored)throw new TypeError("Audit hash mismatch.");
  prev=stored;seq=e.sequence;
 }
 if(doc.entries.length?seq!==doc.lastSequence:
  (doc.lastSequence!==0&&doc.anchorHash==="GENESIS"))
  throw new TypeError("Audit sequence mismatch.");
 return true;
}
export function createPersistentDecisionAudit({filePath,maxEntries=1000,fsOps={},strictFilesystem=false}={}){
 if(typeof filePath!=="string"||!filePath.trim()||
  !Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>10000)
  throw new TypeError("Invalid persistent audit configuration.");
 if(typeof strictFilesystem!=="boolean")throw new TypeError("Invalid filesystem policy.");
 const guard=strictFilesystem?createAuditFilesystemGuard({filePath,fsOps}):null;
 const io={readFile,writeFile,rename,open,mkdir,...fsOps};
 let closed=false,loaded=false,failed=false,queue=Promise.resolve();
 let doc={version:PERSISTENT_DECISION_AUDIT_VERSION,
  anchorHash:"GENESIS",lastSequence:0,entries:[]};
 async function secureReadJournal(){
  if(!strictFilesystem)return io.readFile(filePath,"utf8");
  const flags=constants.O_RDONLY|constants.O_NOFOLLOW;
  const handle=await io.open(filePath,flags);
  try{
   const info=await handle.stat();
   if(!info.isFile()||(process.platform!=="win32"&&(info.mode&0o077)!==0))
    throw Object.assign(new Error("Unsafe opened audit journal."),
     {code:"XSUS_AUDIT_UNSAFE_PATH"});
   return await handle.readFile({encoding:"utf8"});
  }finally{await handle.close();}
 }
 async function load(){
  if(closed||failed)throw new Error("Persistent audit unavailable.");
  if(loaded)throw new Error("Persistent audit already loaded.");
  try{
   if(guard)await guard.check();
   const bytes=await secureReadJournal();
   const parsed=JSON.parse(bytes);
   validate(parsed,maxEntries);
   doc=parsed;
  }catch(e){
   if(e?.code!=="ENOENT"){failed=true;throw e;}
  }
  loaded=true;
  return snapshot();
 }
 function snapshot(){
  if(!loaded||closed||failed)throw new Error("Persistent audit unavailable.");
  return structuredClone(doc);
 }
 async function atomicWrite(next){
  const directory=dirname(filePath);
  const tmp=join(directory,"."+basename(filePath)+"."+randomUUID()+".tmp");
  let created=false;
  try{
   await io.mkdir(directory,{recursive:true});
   await io.writeFile(tmp,JSON.stringify(next),
    strictFilesystem?{encoding:"utf8",mode:0o600}:"utf8");created=true;
   const handle=await io.open(tmp,"r");
   try{await handle.sync();}finally{await handle.close();}
   await io.rename(tmp,filePath);created=false;
   const dirHandle=await io.open(directory,"r");
   try{await dirHandle.sync();}finally{await dirHandle.close();}
  }catch(e){
   // A failed directory sync may occur after rename: fail closed.
   failed=true;
   throw e;
  }finally{
   // Orphan temp files are ignored; never loaded as committed journals.
   void created;
  }
 }
 function append({result}={}){
  const job=queue.then(async()=>{
   if(!loaded||closed||failed)throw new Error("Persistent audit unavailable.");
   if(guard)await guard.check();
   // Reuse v0.7.0 strict result validation and canonical digest fields.
   const receipt=createKnowledgeDecisionAudit().record({result});
   // Exclusive lock is never stolen automatically: uncertain ownership fails closed.
   // Refresh under lock to prevent two processes from overwriting each other's receipts.
   await io.mkdir(dirname(filePath),{recursive:true});
   let lock;
   try{
    lock=await open(filePath+".lock","wx",0o600);
   }catch(e){
    if(e?.code==="EEXIST")throw Object.assign(
     new Error("Audit journal is locked."),{code:"XSUS_AUDIT_LOCKED"});
    throw e;
   }
   let entry;
   try{
    if(guard)await guard.check();
    let current;
    try{
     current=JSON.parse(await secureReadJournal());
     validate(current,maxEntries);
    }catch(e){
     if(e?.code!=="ENOENT")throw e;
     // A fresh journal must not silently replace a previously loaded journal.
     if(doc.lastSequence!==0||doc.entries.length||doc.anchorHash!=="GENESIS")
      throw new Error("Committed audit journal disappeared.");
     current={version:PERSISTENT_DECISION_AUDIT_VERSION,
      anchorHash:"GENESIS",lastSequence:0,entries:[]};
    }
    const payload={sequence:current.lastSequence+1,
     previousHash:current.entries.length?
      current.entries[current.entries.length-1].hash:current.anchorHash,
     status:receipt.status,evidenceCount:receipt.evidenceCount,
     summary:receipt.summary,decisionDigest:receipt.decisionDigest,
     contradictionDigest:receipt.contradictionDigest};
    entry={...payload,hash:hash(payload)};
    const entries=[...current.entries,entry];
    let anchorHash=current.anchorHash;
    if(entries.length>maxEntries)anchorHash=entries.shift().hash;
    const next={version:PERSISTENT_DECISION_AUDIT_VERSION,
     anchorHash,lastSequence:entry.sequence,entries};
    validate(next,maxEntries);
    await atomicWrite(next);
    if(guard)await guard.check();
    doc=next;
   }catch(e){
    failed=true;
    throw e;
   }finally{
    try{await lock.close();await unlink(filePath+".lock");}
    catch(e){failed=true;throw e;}
   }
   return structuredClone(entry);
  });
  queue=job.catch(()=>{});
  return job;
 }
 return Object.freeze({version:PERSISTENT_DECISION_AUDIT_VERSION,
  load,append,snapshot,close(){closed=true;}});
}

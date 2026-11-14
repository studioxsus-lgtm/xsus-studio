/**
 * Hyper XSUS Core v1.9.0 — append-only checkpoint rotation.
 * The directory MUST be protected independently from the audit journal.
 * Files are immutable; interrupted writes are never accepted as checkpoints.
 */
import {mkdir,readdir,open,unlink} from "node:fs/promises";
import {constants} from "node:fs";
import {isAbsolute,resolve,join} from "node:path";
import {createAuditAnchorVerifier} from "./audit-anchor-verifier.js";

export const AUDIT_ANCHOR_ROTATION_VERSION="1.9.0";
const error=(code,message)=>Object.assign(new Error(message),{code});
const name=seq=>`anchor-${String(seq).padStart(16,"0")}.json`;
const parseName=x=>/^anchor-(0|[0-9]{16,})\.json$/.test(x)?
 Number(x.slice(7,-5)):null;
export function createRotatingAuditAnchors({directory,key,keyId,fsOps={}}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||
  resolve(directory)!==directory||directory.includes("\0"))
  throw new TypeError("Anchor directory must be absolute and normalized.");
 const io={mkdir,readdir,open,unlink,...fsOps};
 const verifier=createAuditAnchorVerifier({key,keyId});
 async function list(){
  let files;
  try{files=await io.readdir(directory);}
  catch(e){
   if(e.code==="ENOENT")return [];
   throw e;
  }
  const seqs=files.filter(f=>f.startsWith("anchor-")).map(f=>{
   const n=parseName(f);
   if(n===null||!Number.isSafeInteger(n)||name(n)!==f)
    throw error("XSUS_ANCHOR_INVALID_FILE","Invalid checkpoint filename.");
   return n;
  }).sort((a,b)=>a-b);
  if(seqs.some((n,i)=>i&&n===seqs[i-1]))
   throw error("XSUS_ANCHOR_INVALID_FILE","Duplicate checkpoint sequence.");
  return seqs;
 }
 async function read(seq){
  const file=join(directory,name(seq));
  const handle=await io.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const st=await handle.stat();
   if(!st.isFile()||(process.platform!=="win32"&&(st.mode&0o077)!==0))
    throw error("XSUS_ANCHOR_UNSAFE","Unsafe checkpoint.");
   const data=JSON.parse(await handle.readFile("utf8"));
   if(data.sequence!==seq)throw error("XSUS_ANCHOR_INVALID_FILE","Checkpoint filename mismatch.");
   return data;
  }finally{await handle.close();}
 }
 async function verify(snapshot){
  const seqs=await list();
  if(!seqs.length)throw error("XSUS_ANCHOR_MISSING","No external checkpoint.");
  // The newest checkpoint is authoritative; older signed checkpoints may
  // predate the journal's bounded retention and remain forensic artifacts.
  const latest=seqs.at(-1);
  verifier.verifyAnchor(snapshot,await read(latest));
  return latest;
 }
 async function rotate(snapshot){
  const checkpoint=verifier.createAnchor(snapshot);
  const seqs=await list();
  if(seqs.length){
   await verify(snapshot);
   if(checkpoint.sequence<=seqs.at(-1))
    throw error("XSUS_ANCHOR_NONMONOTONIC","Checkpoint must advance.");
  }
  await io.mkdir(directory,{recursive:true});
  const path=join(directory,name(checkpoint.sequence));
  let handle;
  try{handle=await io.open(path,constants.O_WRONLY|constants.O_CREAT|
   constants.O_EXCL|constants.O_NOFOLLOW,0o600);}
  catch(e){
   if(e.code==="EEXIST")throw error("XSUS_ANCHOR_EXISTS","Checkpoint already exists.");
   throw e;
  }
  try{
   await handle.writeFile(JSON.stringify(checkpoint),"utf8");
   await handle.sync();
  }finally{await handle.close();}
  const dir=await io.open(directory,constants.O_RDONLY);
  try{await dir.sync();}finally{await dir.close();}
  return checkpoint;
 }
 return Object.freeze({version:AUDIT_ANCHOR_ROTATION_VERSION,list,verify,rotate});
}

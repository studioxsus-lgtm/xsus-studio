/**
 * Hyper XSUS Core — External Anchor Store v1.7.0.
 * Immutable local checkpoint; directory must be independently protected.
 * Never silently replace or reconstruct an existing checkpoint.
 */
import {open,lstat,mkdir} from "node:fs/promises";
import {constants} from "node:fs";
import {isAbsolute,resolve,dirname} from "node:path";
import {createAuditAnchorVerifier} from "./audit-anchor-verifier.js";

export const AUDIT_ANCHOR_STORE_VERSION="1.7.0";
const error=(code,message)=>Object.assign(new Error(message),{code});
export function createAuditAnchorStore({filePath,key,keyId,fsOps={}}={}){
 if(typeof filePath!=="string"||!isAbsolute(filePath)||
  resolve(filePath)!==filePath||filePath.includes("\0"))
  throw new TypeError("External anchor path must be absolute and normalized.");
 const verifier=createAuditAnchorVerifier({key,keyId});
 const io={open,lstat,mkdir,...fsOps};
 const flags=constants.O_NOFOLLOW;
 async function read(){
  let handle;
  try{handle=await io.open(filePath,constants.O_RDONLY|flags);}
  catch(e){
   if(e?.code==="ENOENT")throw error("XSUS_ANCHOR_MISSING","External audit anchor missing.");
   throw e;
  }
  try{
   const st=await handle.stat();
   if(!st.isFile()||(process.platform!=="win32"&&(st.mode&0o077)!==0))
    throw error("XSUS_ANCHOR_UNSAFE","Unsafe external audit anchor.");
   const value=JSON.parse(await handle.readFile("utf8"));
   // Authentication is always checked by verifyAnchor against a snapshot.
   return value;
  }finally{await handle.close();}
 }
 async function initialize(snapshot){
  const anchor=verifier.createAnchor(snapshot);
  let handle;
  try{
   // Exclusive creation prevents accidental rollback by replacement.
   handle=await io.open(filePath,constants.O_WRONLY|constants.O_CREAT|
    constants.O_EXCL|flags,0o600);
  }catch(e){
   if(e?.code==="EEXIST")throw error("XSUS_ANCHOR_EXISTS","External anchor already exists.");
   throw e;
  }
  try{
   await handle.writeFile(JSON.stringify(anchor),"utf8");
   await handle.sync();
  }finally{await handle.close();}
  const dir=await io.open(dirname(filePath),constants.O_RDONLY);
  try{await dir.sync();}finally{await dir.close();}
  return anchor;
 }
 async function verify(snapshot){
  return verifier.verifyAnchor(snapshot,await read());
 }
 return Object.freeze({version:AUDIT_ANCHOR_STORE_VERSION,initialize,read,verify});
}

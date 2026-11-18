import {open,lstat} from "node:fs/promises";
import {constants} from "node:fs";
import {createHash} from "node:crypto";
import {string} from "../contracts.js";

const denied=(state)=>Object.freeze({state,retrySafe:false,
 recoveryAuthorized:false,executionAuthorized:false,deletionAuthorized:false});

/**
 * Best-effort, read-only journal observation. Never follows symlinks at open.
 * A digest match is NOT an atomic snapshot or a persistence acknowledgment.
 */
export async function observeReviewJournal({filePath,maxBytes=8*1024*1024}={}){
 string(filePath,"filePath");
 let before;
 try{before=await lstat(filePath);}
 catch(error){
  if(error?.code==="ENOENT")return denied("not_observed");
  return denied("unverifiable");
 }
 if(!before.isFile()||before.isSymbolicLink()||before.size>maxBytes)
  return denied("unverifiable");
 let handle;
 try{
  handle=await open(filePath,constants.O_RDONLY|constants.O_NOFOLLOW);
  const opened=await handle.stat();
  if(!opened.isFile()||opened.dev!==before.dev||opened.ino!==before.ino||
     opened.size>maxBytes)return denied("changed_during_inspection");
  const chunks=[];let size=0;
  for await(const chunk of handle.createReadStream({autoClose:false})){
   size+=chunk.length;
   if(size>maxBytes)return denied("unverifiable");
   chunks.push(chunk);
  }
  const after=await handle.stat();
  const pathname=await lstat(filePath);
  if(after.dev!==opened.dev||after.ino!==opened.ino||
     after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||
     after.ctimeMs!==opened.ctimeMs||pathname.dev!==opened.dev||
     pathname.ino!==opened.ino||pathname.isSymbolicLink())
   return denied("changed_during_inspection");
  return Object.freeze({...denied("observed"),
   fingerprint:createHash("sha256").update(Buffer.concat(chunks)).digest("hex")});
 }catch(error){
  if(error?.code==="ENOENT"||error?.code==="ELOOP")
   return denied("changed_during_inspection");
  return denied("unverifiable");
 }finally{if(handle)await handle.close();}
}

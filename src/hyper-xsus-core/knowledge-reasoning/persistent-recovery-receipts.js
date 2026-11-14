/**
 * Hyper XSUS Core v2.9 — immutable, authenticated recovery receipts.
 * Receipts are evidence only: they NEVER replace trusted external high-water CAS.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
import {open,mkdir,readdir} from "node:fs/promises";
import {constants} from "node:fs";
import {isAbsolute,resolve,join} from "node:path";

export const RECOVERY_RECEIPT_VERSION="2.9.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const filename=n=>`recovery-${String(n).padStart(16,"0")}.json`;
export function createPersistentRecoveryReceipts({directory,key,keyId}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||resolve(directory)!==directory||
  directory.includes("\0")||!(typeof key==="string"||Buffer.isBuffer(key))||
  Buffer.byteLength(key)<32||typeof keyId!=="string"||
  !/^[A-Za-z0-9._-]{1,128}$/.test(keyId))
  throw new TypeError("Absolute directory, secret >=32 bytes and valid keyId required.");
 const secret=Buffer.from(key);
 const sign=(previous,sequence,tipHash)=>
  createHmac("sha256",secret).update(JSON.stringify([RECOVERY_RECEIPT_VERSION,keyId,previous,sequence,tipHash])).digest("hex");
 function validate(x){
  if(!x||typeof x!=="object"||Array.isArray(x)||
   Object.keys(x).sort().join(",")!=="keyId,previous,sequence,signature,tipHash,version"||
   x.version!==RECOVERY_RECEIPT_VERSION||x.keyId!==keyId||
   !valid(x.previous)||!valid(x.sequence)||x.sequence<=x.previous||
   !hex(x.tipHash)||!hex(x.signature))
   throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Malformed recovery receipt.");
  const expected=Buffer.from(sign(x.previous,x.sequence,x.tipHash),"hex");
  if(!timingSafeEqual(expected,Buffer.from(x.signature,"hex")))
   throw fail("XSUS_RECOVERY_RECEIPT_SIGNATURE","Recovery receipt signature mismatch.");
  return x;
 }
 async function read(sequence){
  if(!valid(sequence))throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Invalid sequence.");
  const handle=await open(join(directory,filename(sequence)),constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const stat=await handle.stat();
   if(!stat.isFile()||(process.platform!=="win32"&&(stat.mode&0o077)!==0))
    throw fail("XSUS_RECOVERY_RECEIPT_UNSAFE","Unsafe recovery receipt.");
   const obj=JSON.parse(await handle.readFile("utf8"));
   validate(obj);
   if(obj.sequence!==sequence)throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Filename mismatch.");
   return Object.freeze(obj);
  }finally{await handle.close();}
 }
 async function list(){
  let files;
  try{files=await readdir(directory);}
  catch(e){if(e.code==="ENOENT")return [];throw e;}
  return files.filter(x=>x.startsWith("recovery-")).map(x=>{
   const m=/^recovery-(0|[0-9]{16,})\.json$/.exec(x);
   const n=m?Number(m[1]):NaN;
   if(!valid(n)||filename(n)!==x)
    throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Unexpected recovery filename.");
   return n;
  }).sort((a,b)=>a-b);
 }
 async function record({previous,sequence,tipHash}={}){
  if(!valid(previous)||!valid(sequence)||sequence<=previous||!hex(tipHash))
   throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Invalid recovery evidence.");
  const receipt=Object.freeze({version:RECOVERY_RECEIPT_VERSION,keyId,previous,sequence,tipHash,
   signature:sign(previous,sequence,tipHash)});
  await mkdir(directory,{recursive:true});
  const path=join(directory,filename(sequence));
  const handle=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{await handle.writeFile(JSON.stringify(receipt));await handle.sync();}
  finally{await handle.close();}
  const dir=await open(directory,constants.O_RDONLY);
  try{await dir.sync();}finally{await dir.close();}
  return receipt;
 }
 async function verifyAgainst({trustedSequence,snapshot}={}){
  if(!valid(trustedSequence)||!snapshot||!valid(snapshot.lastSequence))
   throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Invalid verification inputs.");
  const sequences=await list();
  const receipts=[];
  for(const n of sequences){
   const receipt=await read(n);
   if(n>trustedSequence)throw fail("XSUS_RECOVERY_RECEIPT_AHEAD","Receipt exceeds trusted high-water.");
   if(n>snapshot.lastSequence)throw fail("XSUS_RECOVERY_RECEIPT_ROLLBACK","Journal behind receipt.");
   const entry=snapshot.entries?.find(e=>e.sequence===n);
   const observable=entry?.hash??(snapshot.entries?.[0]?.sequence===n+1?snapshot.anchorHash:null);
   if(observable===null||observable===undefined)
    throw fail("XSUS_RECOVERY_RECEIPT_UNVERIFIABLE","Receipt outside journal retention.");
   if(observable!==receipt.tipHash)
    throw fail("XSUS_RECOVERY_RECEIPT_FORK","Journal disagrees with receipt.");
   receipts.push(receipt);
  }
  return Object.freeze({count:receipts.length,latest:sequences.at(-1)??null,status:"verified"});
 }
 return Object.freeze({version:RECOVERY_RECEIPT_VERSION,record,read,list,verifyAgainst});
}

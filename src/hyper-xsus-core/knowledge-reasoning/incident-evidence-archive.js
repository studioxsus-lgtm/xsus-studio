/**
 * Hyper XSUS Core v3.6 — authenticated, append-only incident evidence archive.
 * Fail closed: no overwrite, no automatic recovery, no trusted-state mutation.
 */
import {createHmac,timingSafeEqual,randomUUID} from "node:crypto";
import {mkdir,open,readFile,readdir} from "node:fs/promises";
import {constants} from "node:fs";
import {join,isAbsolute} from "node:path";
export const INCIDENT_ARCHIVE_VERSION="3.6.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const hex=/^[a-f0-9]{64}$/;
const name=n=>`incident-${String(n).padStart(16,"0")}.json`;
export function createIncidentEvidenceArchive({directory,key,keyId}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||
 !(typeof key==="string"||Buffer.isBuffer(key))||Buffer.byteLength(key)<32||
 typeof keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(keyId))
 throw new TypeError("Absolute directory, 32+ byte key and valid keyId required.");
 const secret=Buffer.from(key);
 const digest=payload=>createHmac("sha256",secret).update(JSON.stringify(payload)).digest("hex");
 const sign=(sequence,previous,report)=>digest(["incident-v3.6",keyId,sequence,previous,report]);
 const canonical=report=>{
  if(!report||typeof report!=="object"||!valid(report.sequence)||
   !["verified","manual-intervention-required"].includes(report.status)||
   typeof report.safeToResume!=="boolean"||!Array.isArray(report.blockers)||
   !report.blockers.every(x=>typeof x==="string"&&x.length>0)||
   !Array.isArray(report.missingReceipts)||!Array.isArray(report.unexpectedReceipts)||
   !report.missingReceipts.every(valid)||!report.unexpectedReceipts.every(valid)||
   report.safeToResume!==(report.status==="verified")||
   (report.safeToResume&&report.blockers.length!==0))
   throw fail("XSUS_INCIDENT_ARCHIVE_REPORT_INVALID","Invalid incident decision.");
  return {sequence:report.sequence,status:report.status,safeToResume:report.safeToResume,
   blockers:[...report.blockers],missingReceipts:[...report.missingReceipts],
   unexpectedReceipts:[...report.unexpectedReceipts]};
 };
 async function syncDirectory(){
  const h=await open(directory,constants.O_RDONLY);
  try{await h.sync();}finally{await h.close();}
 }
 async function listNames(){
  let files;
  try{files=await readdir(directory);}
  catch(e){if(e.code==="ENOENT")return [];throw e;}
  const records=files.filter(f=>/^incident-\d{16}\.json$/.test(f)).sort();
  for(let i=0;i<records.length;i++)
   if(records[i]!==name(i+1))throw fail("XSUS_INCIDENT_ARCHIVE_GAP","Incident sequence gap or fork.");
  return records;
 }
 async function verify(){
  const files=await listNames();
  let previous="0".repeat(64);
  const entries=[];
  for(let i=0;i<files.length;i++){
   let record;
   try{record=JSON.parse(await readFile(join(directory,files[i]),"utf8"));}
   catch{throw fail("XSUS_INCIDENT_ARCHIVE_INVALID","Unreadable incident evidence.");}
   if(!record||Object.keys(record).sort().join(",")!=="keyId,previous,report,sequence,signature,version"||
    record.version!=="3.6.0"||record.keyId!==keyId||
    record.sequence!==i+1||record.previous!==previous||
    typeof record.signature!=="string"||!hex.test(record.signature))
    throw fail("XSUS_INCIDENT_ARCHIVE_INVALID","Malformed incident evidence.");
   let report;
   try{report=canonical(record.report);}catch{throw fail("XSUS_INCIDENT_ARCHIVE_INVALID","Malformed report.");}
   if(JSON.stringify(report)!==JSON.stringify(record.report))
    throw fail("XSUS_INCIDENT_ARCHIVE_INVALID","Noncanonical report.");
   const actual=sign(record.sequence,previous,report);
   if(!timingSafeEqual(Buffer.from(actual,"hex"),Buffer.from(record.signature,"hex")))
    throw fail("XSUS_INCIDENT_ARCHIVE_SIGNATURE","Incident signature mismatch.");
   previous=actual;
   entries.push(Object.freeze({sequence:record.sequence,report:Object.freeze(report),signature:actual}));
  }
  return Object.freeze({count:entries.length,tip:previous,entries:Object.freeze(entries)});
 }
 async function record(report){
  const data=canonical(report);
  await mkdir(directory,{recursive:true,mode:0o700});
  const before=await verify();
  const sequence=before.count+1,previous=before.tip;
  const signature=sign(sequence,previous,data);
  const item={version:"3.6.0",keyId,sequence,previous,report:data,signature};
  const path=join(directory,name(sequence));
  let h;
  try{
   h=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
   await h.writeFile(JSON.stringify(item));
   await h.sync();
  }catch(e){
   if(e.code==="EEXIST")throw fail("XSUS_INCIDENT_ARCHIVE_CONFLICT","Concurrent incident writer.");
   throw e;
  }finally{if(h)await h.close();}
  await syncDirectory();
  const after=await verify();
  if(after.count!==sequence||after.tip!==signature)
   throw fail("XSUS_INCIDENT_ARCHIVE_CONFLICT","Incident archive changed during append.");
  return Object.freeze({sequence,signature});
 }
 return Object.freeze({version:INCIDENT_ARCHIVE_VERSION,record,verify});
}

/**
 * Hyper XSUS Core v6.9.0 — persistent reliability report history.
 * Local atomic JSON, cooperative file locking; no repair or automatic cleanup.
 */
import {readFile} from "node:fs/promises";
import {writeAtomicJson} from "./atomic-json-writer.js";
import {withExclusiveFileLock} from "./exclusive-file-lock.js";
import {createReliabilityReport,compareReliabilityReports} from "./transaction-journal-reliability-reporting.js";

export const PERSISTENT_RELIABILITY_HISTORY_VERSION="6.9.0";

export function createPersistentReliabilityHistory({filePath,maxEntries=100}={}){
 if(typeof filePath!=="string"||!filePath.trim())throw new TypeError("filePath must be non-empty.");
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>10000)
  throw new RangeError("maxEntries must be between 1 and 10000.");
 let closed=false,queue=Promise.resolve();
 const enqueue=fn=>{
  if(closed)return Promise.reject(new Error("Persistent reliability history is closed."));
  const next=queue.then(fn);queue=next.catch(()=>{});return next;
 };
 function validate(entries){
  if(!Array.isArray(entries)||entries.length>maxEntries)
   throw new TypeError("Invalid reliability history entries.");
  return Object.freeze(entries.map(entry=>{
   if(!entry||typeof entry!=="object"||Array.isArray(entry)||
      !Number.isSafeInteger(entry.timestamp)||entry.timestamp<0)
    throw new TypeError("Invalid reliability history timestamp.");
   const report=createReliabilityReport(entry.report);
   // Refuse stale or forged derived fields rather than silently normalizing.
   if(JSON.stringify(report)!==JSON.stringify(entry.report))
    throw new TypeError("Invalid reliability history report shape.");
   return Object.freeze({timestamp:entry.timestamp,report});
  }));
 }
 async function readCommitted(){
  let raw;
  try{raw=await readFile(filePath,"utf8");}
  catch(error){if(error?.code==="ENOENT")return Object.freeze([]);throw error;}
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
     parsed.version!==PERSISTENT_RELIABILITY_HISTORY_VERSION)
   throw new TypeError("Invalid persistent reliability history format.");
  return validate(parsed.entries);
 }
 function comparable(entries,testId){
  return entries.filter(x=>x.report.testId===testId);
 }
 return Object.freeze({
  load(){return enqueue(readCommitted);},
  save(entries){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
   const valid=validate(entries);
   await writeAtomicJson(filePath,{version:PERSISTENT_RELIABILITY_HISTORY_VERSION,entries:valid});
   return valid;
  }));},
  append(measurement,{timestamp=Date.now()}={}){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
   if(!Number.isSafeInteger(timestamp)||timestamp<0)
    throw new TypeError("Invalid reliability history timestamp.");
   const report=createReliabilityReport(measurement);
   const existing=await readCommitted();
   const entry=Object.freeze({timestamp,report});
   const entries=validate([...existing,entry].slice(-maxEntries));
   await writeAtomicJson(filePath,{version:PERSISTENT_RELIABILITY_HISTORY_VERSION,entries});
   return entry;
  }));},
  compareLatest(testId,{maxSlowdownRatio=1.5}={}){return enqueue(async()=>{
   if(typeof testId!=="string"||!testId)throw new TypeError("testId is required.");
   const entries=comparable(await readCommitted(),testId);
   if(entries.length<2)return null;
   return compareReliabilityReports(entries.at(-2).report,entries.at(-1).report,{maxSlowdownRatio});
  });},
  async close(){closed=true;await queue;},
 });
}

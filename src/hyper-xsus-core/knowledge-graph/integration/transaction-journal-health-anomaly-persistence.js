/**
 * Hyper XSUS Core — persistent anomaly history v6.4.0.
 * Dedicated JSON file; cooperating writers only. No automatic repair or lock removal.
 */
import {readFile} from "node:fs/promises";
import {writeAtomicJson} from "./atomic-json-writer.js";
import {withExclusiveFileLock} from "./exclusive-file-lock.js";
import {createAnomalyHistory} from "./transaction-journal-health-anomaly-history.js";

export const PERSISTENT_ANOMALY_HISTORY_VERSION="6.4.0";

export function createPersistentAnomalyHistory({filePath,maxEntries=100}={}){
 if(typeof filePath!=="string"||!filePath.trim())
  throw new TypeError("filePath must be a non-empty string.");
 createAnomalyHistory({maxEntries});
 let closing=false;
 let queue=Promise.resolve();
 const enqueue=operation=>{
  if(closing)return Promise.reject(new Error("Persistent anomaly history store is closed."));
  const next=queue.then(operation);
  queue=next.catch(()=>{});
  return next;
 };
 function validate(items){
  if(!Array.isArray(items)||items.length>maxEntries)
   throw new TypeError("Invalid persistent anomaly history entries.");
  const history=createAnomalyHistory({maxEntries});
  for(const item of items){
   if(!item||typeof item!=="object"||Array.isArray(item)||
      !Number.isSafeInteger(item.anomalyCount)||item.anomalyCount!==item.anomalies?.length)
    throw new TypeError("Invalid persistent anomaly history observation.");
   history.record({status:item.status,anomalyCount:item.anomalyCount,anomalies:item.anomalies},
    {timestamp:item.timestamp});
  }
  return history.list();
 }
 async function readCommitted(){
  let raw;
  try{raw=await readFile(filePath,"utf8");}
  catch(error){if(error?.code==="ENOENT")return Object.freeze([]);throw error;}
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
     parsed.version!==PERSISTENT_ANOMALY_HISTORY_VERSION)
   throw new TypeError("Invalid persistent anomaly history format.");
  return validate(parsed.entries);
 }
 return Object.freeze({
  load(){return enqueue(readCommitted);},
  save(entries){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
   const valid=validate(entries);
   await writeAtomicJson(filePath,{version:PERSISTENT_ANOMALY_HISTORY_VERSION,entries:valid});
   return valid;
  }));},
  append(evaluation,{timestamp=Date.now()}={}){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
   const existing=await readCommitted();
   const history=createAnomalyHistory({maxEntries});
   for(const item of existing)history.record({
    status:item.status,anomalyCount:item.anomalyCount,anomalies:item.anomalies,
   },{timestamp:item.timestamp});
   const appended=history.record(evaluation,{timestamp});
   await writeAtomicJson(filePath,{version:PERSISTENT_ANOMALY_HISTORY_VERSION,entries:history.list()});
   return appended;
  }));},
  async close(){closing=true;await queue;},
 });
}

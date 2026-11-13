/**
 * Hyper XSUS Core — persistent alert history v5.4.0.
 * Separate local JSON store; cooperating writers only. Never repairs corrupt bytes.
 */
import {readFile} from "node:fs/promises";
import {writeAtomicJson} from "./atomic-json-writer.js";
import {withExclusiveFileLock} from "./exclusive-file-lock.js";
import {createHealthAlertHistory} from "./transaction-journal-health-alert-history.js";

export const PERSISTENT_ALERT_HISTORY_VERSION="5.4.0";

export function createPersistentAlertHistory({filePath,maxEntries=100}={}){
  if(typeof filePath!=="string"||!filePath.trim())
    throw new TypeError("filePath must be a non-empty string.");
  createHealthAlertHistory({maxEntries}); // validate capacity
  let closing=false;
  let queue=Promise.resolve();
  const enqueue=(fn)=>{
    if(closing)return Promise.reject(new Error("Persistent alert history store is closed."));
    const next=queue.then(fn);
    queue=next.catch(()=>{});
    return next;
  };
  function validate(items){
    if(!Array.isArray(items)||items.length>maxEntries)
      throw new TypeError("Invalid persistent alert history entries.");
    const history=createHealthAlertHistory({maxEntries});
    for(const item of items){
      if(!item||typeof item!=="object"||Array.isArray(item)||
         !Number.isSafeInteger(item.alertCount)||item.alertCount!==item.alerts?.length)
        throw new TypeError("Invalid persistent alert history observation.");
      history.record({status:item.status,alerts:item.alerts},{timestamp:item.timestamp});
    }
    return history.list();
  }
  async function readCommitted(){
    let raw;
    try{raw=await readFile(filePath,"utf8");}
    catch(error){if(error?.code==="ENOENT")return Object.freeze([]);throw error;}
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
       parsed.version!==PERSISTENT_ALERT_HISTORY_VERSION)
      throw new TypeError("Invalid persistent alert history format.");
    return validate(parsed.entries);
  }
  return Object.freeze({
    load(){return enqueue(readCommitted);},
    save(entries){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
      const valid=validate(entries);
      await writeAtomicJson(filePath,{version:PERSISTENT_ALERT_HISTORY_VERSION,entries:valid});
      return valid;
    }));},
    append(evaluation,{timestamp=Date.now()}={}){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
      const existing=await readCommitted();
      const history=createHealthAlertHistory({maxEntries});
      for(const item of existing)history.record({status:item.status,alerts:item.alerts},{timestamp:item.timestamp});
      const appended=history.record(evaluation,{timestamp});
      await writeAtomicJson(filePath,{version:PERSISTENT_ALERT_HISTORY_VERSION,entries:history.list()});
      return appended;
    }));},
    async close(){closing=true;await queue;},
  });
}

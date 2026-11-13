/**
 * Hyper XSUS Core — persistent health history v4.4.0.
 * Separate from the transaction journal. Local filesystem, cooperating writers only.
 * Loading never repairs or overwrites invalid committed bytes.
 */
import { readFile } from "node:fs/promises";
import { writeAtomicJson } from "./atomic-json-writer.js";
import { withExclusiveFileLock } from "./exclusive-file-lock.js";
import { createTransactionJournalHealthHistory } from "./transaction-journal-health-history.js";

export const PERSISTENT_HEALTH_HISTORY_VERSION = "4.4.0";

export function createPersistentJournalHealthHistory({filePath,maxEntries=100}={}) {
  if (typeof filePath !== "string" || !filePath.trim())
    throw new TypeError("filePath must be a non-empty string.");
  const validate = (items) => {
    if (!Array.isArray(items) || items.length > maxEntries)
      throw new TypeError("Invalid persistent health history entries.");
    const candidate=createTransactionJournalHealthHistory({maxEntries});
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          typeof item.journalStatus !== "string" ||
          (item.revision !== null && typeof item.revision !== "string"))
        throw new TypeError("Invalid persistent health observation.");
      candidate.record({
        level:item.level,journalStatus:item.journalStatus,revision:item.revision,
        warnings:item.warnings,transactionCounts:item.transactionCounts,
      },{timestamp:item.timestamp});
    }
    return candidate.list();
  };
  // Validate capacity even for an empty store.
  createTransactionJournalHealthHistory({maxEntries});
  let queue=Promise.resolve();
  let closed=false;
  const ensureOpen=()=>{if(closed) throw new Error("Persistent health history store is closed.");};
  const enqueue=(operation)=>{
    const next=queue.then(()=>{ensureOpen();return operation();});
    queue=next.catch(()=>{});
    return next;
  };
  async function loadCommitted(){
    let raw;
    try {raw=await readFile(filePath,"utf8");}
    catch(error){if(error?.code==="ENOENT") return Object.freeze([]);throw error;}
    const parsed=JSON.parse(raw);
    if (!parsed || typeof parsed!=="object" || Array.isArray(parsed) ||
        parsed.version!==PERSISTENT_HEALTH_HISTORY_VERSION)
      throw new TypeError("Invalid persistent health history format.");
    return validate(parsed.entries);
  }
  return Object.freeze({
    load(){return enqueue(()=>loadCommitted());},
    save(entries){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
      const valid=validate(entries);
      await writeAtomicJson(filePath,{version:PERSISTENT_HEALTH_HISTORY_VERSION,entries:valid});
      return valid;
    }));},
    append(report,{timestamp=Date.now()}={}){return enqueue(()=>withExclusiveFileLock(filePath,async()=>{
      const existing=await loadCommitted();
      const history=createTransactionJournalHealthHistory({maxEntries});
      for(const entry of existing) history.record({
        level:entry.level,journalStatus:entry.journalStatus,revision:entry.revision,
        warnings:entry.warnings,transactionCounts:entry.transactionCounts,
      },{timestamp:entry.timestamp});
      const appended=history.record(report,{timestamp});
      await writeAtomicJson(filePath,{version:PERSISTENT_HEALTH_HISTORY_VERSION,entries:history.list()});
      return appended;
    }));},
    async close(){closed=true;await queue;},
  });
}

/**
 * Hyper XSUS Core — read-only persistent health history diagnostics v5.1.0.
 * Advisory observations: file and lock are not inspected atomically.
 */
import { readFile,lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createPersistentJournalHealthHistory } from "./transaction-journal-health-persistence.js";

export const HEALTH_HISTORY_DIAGNOSTICS_VERSION="5.1.0";

export async function diagnosePersistentHealthHistory(filePath,{maxEntries=100}={}){
  if(typeof filePath!=="string"||!filePath.trim())
    throw new TypeError("filePath must be a non-empty string.");
  // Validate capacity even if the file is absent or invalid.
  const store=createPersistentJournalHealthHistory({filePath,maxEntries});
  let status="healthy",errorCode=null,revision=null,entryCount=null;
  let firstTimestamp=null,latestTimestamp=null,latestLevel=null;
  try{
    // Read raw bytes first to distinguish missing from a valid empty snapshot.
    let raw;
    try{raw=await readFile(filePath,"utf8");}
    catch(error){if(error?.code==="ENOENT")status="missing";else throw error;}
    if(status!=="missing"){
      // The existing persistence validator remains the authority for entries.
      // A concurrent writer can replace the file between these reads; digest
      // and validated entries are advisory rather than a shared atomic snapshot.
      const entries=await store.load();
      revision=createHash("sha256").update(raw).digest("hex");
      entryCount=entries.length;
      firstTimestamp=entries[0]?.timestamp??null;
      latestTimestamp=entries.at(-1)?.timestamp??null;
      latestLevel=entries.at(-1)?.level??null;
    }
  }catch(error){
    status="invalid";
    errorCode=error?.code??(error instanceof SyntaxError?"INVALID_JSON":"INVALID_HEALTH_HISTORY");
    revision=null;entryCount=null;firstTimestamp=null;latestTimestamp=null;latestLevel=null;
  }finally{await store.close();}
  let lockPresent=false;
  try{await lstat(filePath+".lock");lockPresent=true;}
  catch(error){if(error?.code!=="ENOENT")throw error;}
  return Object.freeze({
    version:HEALTH_HISTORY_DIAGNOSTICS_VERSION,status,errorCode,revision,
    entryCount,firstTimestamp,latestTimestamp,latestLevel,lockPresent,
    readOnly:true,cleanupPerformed:false,advisory:true,
  });
}

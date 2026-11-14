/**
 * Hyper XSUS Core — read-only persistent alert history diagnostics v6.1.0.
 * Advisory only: the file and lock are observed at different instants.
 * Does not create, repair, remove, or lock any files.
 */
import {readFile,lstat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory} from "./transaction-journal-health-alert-persistence.js";

export const ALERT_HISTORY_DIAGNOSTICS_VERSION="6.1.0";

export async function diagnosePersistentAlertHistory(filePath,{maxEntries=100}={}){
  if(typeof filePath!=="string"||!filePath.trim())
    throw new TypeError("filePath must be a non-empty string.");
  // Validate maxEntries using the canonical persistence constructor.
  const store=createPersistentAlertHistory({filePath,maxEntries});
  let status="healthy",errorCode=null,revision=null,entryCount=null;
  let firstTimestamp=null,latestTimestamp=null,latestStatus=null,latestAlertCount=null;
  try{
    let raw;
    try{raw=await readFile(filePath,"utf8");}
    catch(error){if(error?.code==="ENOENT")status="missing";else throw error;}
    if(status!=="missing"){
      // Persistence validation remains authoritative. Concurrent replacement
      // may occur between reading raw bytes and validating the entries.
      const entries=await store.load();
      revision=createHash("sha256").update(raw).digest("hex");
      entryCount=entries.length;
      firstTimestamp=entries[0]?.timestamp??null;
      latestTimestamp=entries.at(-1)?.timestamp??null;
      latestStatus=entries.at(-1)?.status??null;
      latestAlertCount=entries.at(-1)?.alertCount??null;
    }
  }catch(error){
    status="invalid";
    errorCode=error?.code??(error instanceof SyntaxError?"INVALID_JSON":"INVALID_ALERT_HISTORY");
    revision=null;entryCount=null;firstTimestamp=null;latestTimestamp=null;
    latestStatus=null;latestAlertCount=null;
  }finally{await store.close();}
  let lockPresent=false;
  try{await lstat(filePath+".lock");lockPresent=true;}
  catch(error){if(error?.code!=="ENOENT")throw error;}
  return Object.freeze({
    version:ALERT_HISTORY_DIAGNOSTICS_VERSION,status,errorCode,revision,
    entryCount,firstTimestamp,latestTimestamp,latestStatus,latestAlertCount,
    lockPresent,readOnly:true,cleanupPerformed:false,advisory:true,
  });
}

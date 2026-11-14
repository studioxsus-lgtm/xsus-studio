import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory} from "../../integration/transaction-journal-health-alert-persistence.js";
import {diagnosePersistentAlertHistory,ALERT_HISTORY_DIAGNOSTICS_VERSION} from "../../integration/transaction-journal-health-alert-diagnostics.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";

async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-diagnostics-v61-"));
 try{await fn(join(dir,"alerts.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
const warning={status:"attention",alerts:[{code:"XSUS_TEST_WARNING",severity:"warning",consecutive:1,repeated:false}]};
describe("Hyper XSUS Core — persistent alert history diagnostics v6.1.0",()=>{
 it("reports missing history without creating a file or lock",async()=>{
  await fixture(async(filePath)=>{
   const result=await diagnosePersistentAlertHistory(filePath);
   expect(result).toMatchObject({
    version:ALERT_HISTORY_DIAGNOSTICS_VERSION,status:"missing",
    errorCode:null,revision:null,entryCount:null,lockPresent:false,
    readOnly:true,cleanupPerformed:false,advisory:true,
   });
   await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
   expect(Object.isFrozen(result)).toBe(true);
  });
 });
 it("reports valid history counts, latest alert and raw SHA-256 without mutation",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:5});
   await store.append({status:"healthy",alerts:[]},{timestamp:10});
   await store.append(warning,{timestamp:20});
   await store.close();
   const before=await readFile(filePath,"utf8");
   const report=await diagnosePersistentAlertHistory(filePath,{maxEntries:5});
   expect(report).toMatchObject({
    status:"healthy",entryCount:2,firstTimestamp:10,latestTimestamp:20,
    latestStatus:"attention",latestAlertCount:1,lockPresent:false,
    revision:createHash("sha256").update(before).digest("hex"),
    readOnly:true,advisory:true,cleanupPerformed:false,
   });
   expect(await readFile(filePath,"utf8")).toBe(before);
  });
 });
 it("detects malformed JSON and invalid committed entries without repair",async()=>{
  await fixture(async(filePath)=>{
   for(const raw of ['{"version":',JSON.stringify({version:"5.4.0",entries:[{timestamp:1,status:"healthy",alertCount:1,alerts:[]}]})]){
    await writeFile(filePath,raw,"utf8");
    const result=await diagnosePersistentAlertHistory(filePath);
    expect(result.status).toBe("invalid");
    expect(result.errorCode).toBe(raw==='{"version":'?"INVALID_JSON":"INVALID_ALERT_HISTORY");
    expect(result.revision).toBeNull();
    expect(await readFile(filePath,"utf8")).toBe(raw);
   }
  });
 });
 it("reports a held lock without stealing it or modifying committed bytes",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath});
   await store.append(warning,{timestamp:1});
   await store.close();
   const before=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    const report=await diagnosePersistentAlertHistory(filePath);
    expect(report.status).toBe("healthy");
    expect(report.lockPresent).toBe(true);
    expect(await readFile(filePath,"utf8")).toBe(before);
    await stat(filePath+".lock");
   });
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  });
 });
 it("validates capacity even if the history file does not exist",async()=>{
  await fixture(async(filePath)=>{
   await expect(diagnosePersistentAlertHistory(filePath,{maxEntries:0})).rejects.toThrow(RangeError);
  });
 });
});

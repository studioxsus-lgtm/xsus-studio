import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentAlertHistory,PERSISTENT_ALERT_HISTORY_VERSION} from "../../integration/transaction-journal-health-alert-persistence.js";
import {evaluateHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";

const evaluation=(i)=>evaluateHealthHistoryAlerts({
  status:i%2?"missing":"healthy",lockPresent:false,
  entryCount:i%2?null:1,latestLevel:i%2?null:"healthy",
});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-persistence-v54-"));
 try{await fn(join(dir,"alerts.json"));}finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — Persistent Alert History v5.4.0",()=>{
 it("loads missing history without creating a file",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath});
   expect(await store.load()).toEqual([]);
   await store.close();
   await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
  });
 });
 it("retains bounded history across fresh instances and validates file version",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:3});
   for(let i=1;i<=7;i++)await store.append(evaluation(i),{timestamp:i});
   await store.close();
   const raw=JSON.parse(await readFile(filePath,"utf8"));
   expect(raw.version).toBe(PERSISTENT_ALERT_HISTORY_VERSION);
   const restarted=createPersistentAlertHistory({filePath,maxEntries:3});
   expect((await restarted.load()).map(x=>x.timestamp)).toEqual([5,6,7]);
   await restarted.close();
  });
 });
 it("serializes 50 concurrent calls within one instance and closes after pending work",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:10});
   const pending=Promise.all(Array.from({length:50},(_,i)=>store.append(evaluation(i+1),{timestamp:i+1})));
   await store.close();
   await pending;
   const fresh=createPersistentAlertHistory({filePath,maxEntries:10});
   expect((await fresh.load()).map(x=>x.timestamp)).toEqual([41,42,43,44,45,46,47,48,49,50]);
   await fresh.close();
   await expect(store.load()).rejects.toThrow(/closed/);
  });
 },120000);
 it("rejects a busy cooperating lock and preserves committed bytes",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath});
   await store.append(evaluation(1),{timestamp:1});
   const before=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    await expect(store.append(evaluation(2),{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
    expect(await readFile(filePath,"utf8")).toBe(before);
   });
   await store.append(evaluation(3),{timestamp:3});
   expect((await store.load()).map(x=>x.timestamp)).toEqual([1,3]);
   await store.close();
  });
 });
 it("fails closed on malformed committed entries and never overwrites them",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath});
   await store.append(evaluation(1),{timestamp:1});
   const parsed=JSON.parse(await readFile(filePath,"utf8"));
   parsed.entries[0].alertCount=99;
   const corrupt=JSON.stringify(parsed);
   await writeFile(filePath,corrupt,"utf8");
   await expect(store.load()).rejects.toThrow();
   await expect(store.append(evaluation(2),{timestamp:2})).rejects.toThrow();
   expect(await readFile(filePath,"utf8")).toBe(corrupt);
   await store.close();
  });
 });
});

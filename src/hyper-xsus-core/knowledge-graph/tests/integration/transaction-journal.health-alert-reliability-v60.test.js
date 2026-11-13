import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory,PERSISTENT_ALERT_HISTORY_VERSION} from "../../integration/transaction-journal-health-alert-persistence.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";

const observation=i=>i%3===0?{status:"healthy",alerts:[]}:
 i%3===1?{status:"attention",alerts:[{code:"XSUS_WARNING",severity:"warning",consecutive:i,repeated:i>1}]}:
 {status:"critical",alerts:[{code:"XSUS_CRITICAL",severity:"critical",consecutive:i,repeated:i>2}]};
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-reliability-v60-"));
 try{await fn(join(dir,"alerts.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — Persistent Alert History Reliability Milestone v6.0.0",()=>{
 it("combines bounded persistence, independent reopen, integrity and continued append",async()=>{
  await fixture(async(filePath)=>{
   const writer=createPersistentAlertHistory({filePath,maxEntries:12});
   try{
    for(let i=1;i<=48;i++)await writer.append(observation(i),{timestamp:i});
   }finally{await writer.close();}
   const bytes=await readFile(filePath,"utf8");
   const parsed=JSON.parse(bytes);
   expect(parsed.version).toBe(PERSISTENT_ALERT_HISTORY_VERSION);
   expect(parsed.entries.map(x=>x.timestamp)).toEqual(Array.from({length:12},(_,i)=>37+i));
   const originalHash=hash(bytes);
   const reader=createPersistentAlertHistory({filePath,maxEntries:12});
   try{
    const entries=await reader.load();
    expect(entries.map(x=>x.timestamp)).toEqual(parsed.entries.map(x=>x.timestamp));
    expect(entries.every(x=>x.alertCount===x.alerts.length)).toBe(true);
    expect(entries.every(x=>x.alerts.every(a=>a.code&&a.consecutive>=1))).toBe(true);
   }finally{await reader.close();}
   expect(hash(await readFile(filePath,"utf8"))).toBe(originalHash);
   const resumed=createPersistentAlertHistory({filePath,maxEntries:12});
   try{
    await resumed.append(observation(49),{timestamp:49});
    expect((await resumed.load()).map(x=>x.timestamp)).toEqual(Array.from({length:12},(_,i)=>38+i));
   }finally{await resumed.close();}
   expect(hash(await readFile(filePath,"utf8"))).not.toBe(originalHash);
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  });
 },120000);
 it("keeps committed bytes unchanged on lock contention, then resumes after lock release",async()=>{
  await fixture(async(filePath)=>{
   const writer=createPersistentAlertHistory({filePath,maxEntries:12});
   await writer.append(observation(1),{timestamp:1});
   await writer.close();
   const committed=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    const competing=createPersistentAlertHistory({filePath,maxEntries:12});
    try{
     await expect(competing.append(observation(2),{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
     expect(await readFile(filePath,"utf8")).toBe(committed);
    }finally{await competing.close();}
   });
   const reopened=createPersistentAlertHistory({filePath,maxEntries:12});
   try{
    await reopened.append(observation(3),{timestamp:3});
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,3]);
   }finally{await reopened.close();}
  });
 });
 it("rejects corrupt persisted snapshots without modifying or silently repairing them",async()=>{
  await fixture(async(filePath)=>{
   const writer=createPersistentAlertHistory({filePath,maxEntries:12});
   await writer.append(observation(1),{timestamp:1});
   await writer.close();
   const original=await readFile(filePath,"utf8");
   const invalid=JSON.parse(original);
   invalid.entries[0].alertCount=1000;
   const {writeFile}=await import("node:fs/promises");
   await writeFile(filePath,JSON.stringify(invalid),"utf8");
   const corrupt=await readFile(filePath,"utf8");
   const reader=createPersistentAlertHistory({filePath,maxEntries:12});
   try{
    await expect(reader.load()).rejects.toThrow();
    await expect(reader.append(observation(2),{timestamp:2})).rejects.toThrow();
    expect(await readFile(filePath,"utf8")).toBe(corrupt);
   }finally{await reader.close();}
  });
 });
});

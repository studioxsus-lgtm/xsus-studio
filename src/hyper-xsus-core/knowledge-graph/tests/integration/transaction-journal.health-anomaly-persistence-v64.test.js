import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentAnomalyHistory,PERSISTENT_ANOMALY_HISTORY_VERSION} from "../../integration/transaction-journal-health-anomaly-persistence.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";

const evaluation=i=>i%2===0?{status:"healthy",anomalyCount:0,anomalies:[]}:
 {status:"attention",anomalyCount:1,anomalies:[{code:"LOCK_PRESENT",severity:"warning",consecutive:i,repeated:i>1}]};
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anomaly-persistence-v64-"));
 try{await fn(join(dir,"anomalies.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — persistent anomaly history v6.4.0",()=>{
 it("loads missing history as empty without creating files",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAnomalyHistory({filePath});
   try{expect(await store.load()).toEqual([]);}
   finally{await store.close();}
   await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
  });
 });
 it("persists bounded history and restores it from a fresh instance",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAnomalyHistory({filePath,maxEntries:3});
   for(let i=1;i<=8;i++)await store.append(evaluation(i),{timestamp:i});
   await store.close();
   const persisted=JSON.parse(await readFile(filePath,"utf8"));
   expect(persisted.version).toBe(PERSISTENT_ANOMALY_HISTORY_VERSION);
   expect(persisted.entries.map(x=>x.timestamp)).toEqual([6,7,8]);
   const reopened=createPersistentAnomalyHistory({filePath,maxEntries:3});
   try{expect((await reopened.load()).map(x=>x.timestamp)).toEqual([6,7,8]);}
   finally{await reopened.close();}
  });
 });
 it("serializes 50 queued appends and close waits for completion",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAnomalyHistory({filePath,maxEntries:10});
   const pending=Promise.all(Array.from({length:50},(_,i)=>store.append(evaluation(i+1),{timestamp:i+1})));
   await store.close();
   await pending;
   const fresh=createPersistentAnomalyHistory({filePath,maxEntries:10});
   try{expect((await fresh.load()).map(x=>x.timestamp)).toEqual([41,42,43,44,45,46,47,48,49,50]);}
   finally{await fresh.close();}
  });
 },60000);
 it("refuses competing writers without altering committed bytes",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAnomalyHistory({filePath});
   await store.append(evaluation(1),{timestamp:1});
   await store.close();
   const before=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    const competing=createPersistentAnomalyHistory({filePath});
    try{await expect(competing.append(evaluation(2),{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});}
    finally{await competing.close();}
    expect(await readFile(filePath,"utf8")).toBe(before);
   });
  });
 });
 it("fails closed on corrupt observations and leaves bytes untouched",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAnomalyHistory({filePath});
   await store.append(evaluation(1),{timestamp:1});
   await store.close();
   const invalid=JSON.parse(await readFile(filePath,"utf8"));
   invalid.entries[0].anomalyCount=999;
   const bytes=JSON.stringify(invalid);
   await writeFile(filePath,bytes,"utf8");
   const reopened=createPersistentAnomalyHistory({filePath});
   try{
    await expect(reopened.load()).rejects.toThrow();
    await expect(reopened.append(evaluation(2),{timestamp:2})).rejects.toThrow();
    expect(await readFile(filePath,"utf8")).toBe(bytes);
   }finally{await reopened.close();}
  });
 });
 it("validates capacity and rejects invalid saved entries",async()=>{
  await fixture(async(filePath)=>{
   expect(()=>createPersistentAnomalyHistory({filePath,maxEntries:0})).toThrow(RangeError);
   const store=createPersistentAnomalyHistory({filePath,maxEntries:2});
   try{
    await expect(store.save([{timestamp:1,status:"healthy",anomalyCount:2,anomalies:[]}])).rejects.toThrow();
    await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
   }finally{await store.close();}
  });
 });
});

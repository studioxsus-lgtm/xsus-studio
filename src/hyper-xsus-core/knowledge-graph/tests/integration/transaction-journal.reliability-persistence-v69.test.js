import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentReliabilityHistory,PERSISTENT_RELIABILITY_HISTORY_VERSION} from "../../integration/transaction-journal-reliability-persistence.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";
const measurement=(overrides={})=>({testId:"sigkill",mode:"post-commit-SIGKILL",
 operations:100,passed:100,failed:0,elapsedMs:1000,integrityVerified:true,
 powerLossVerified:false,revision:null,errors:[],...overrides});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-reliability-v69-"));
 try{await fn(join(dir,"reports.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — persistent reliability history v6.9.0",()=>{
 it("loads missing history without creating a file",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentReliabilityHistory({filePath});
   try{expect(await store.load()).toEqual([]);}
   finally{await store.close();}
   await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
  });
 });
 it("persists reports across restart and detects a historical performance regression",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentReliabilityHistory({filePath});
   await store.append(measurement(),{timestamp:1});
   await store.append(measurement({elapsedMs:1800}),{timestamp:2});
   await store.close();
   const reopened=createPersistentReliabilityHistory({filePath});
   try{
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2]);
    expect((await reopened.compareLatest("sigkill")).reasons).toEqual(["DURATION_REGRESSED"]);
    expect(await reopened.compareLatest("missing")).toBe(null);
   }finally{await reopened.close();}
  });
 });
 it("bounds history and serializes 30 queued writes",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentReliabilityHistory({filePath,maxEntries:5});
   const pending=Promise.all(Array.from({length:30},(_,i)=>store.append(measurement(),{timestamp:i+1})));
   await store.close();await pending;
   const reopened=createPersistentReliabilityHistory({filePath,maxEntries:5});
   try{expect((await reopened.load()).map(x=>x.timestamp)).toEqual([26,27,28,29,30]);}
   finally{await reopened.close();}
   expect(JSON.parse(await readFile(filePath,"utf8")).version).toBe(PERSISTENT_RELIABILITY_HISTORY_VERSION);
  });
 });
 it("fails closed on corrupt bytes without automatic repair",async()=>{
  await fixture(async filePath=>{
   const invalid='{"version":"6.9.0","entries":[';
   await writeFile(filePath,invalid);
   const store=createPersistentReliabilityHistory({filePath});
   try{
    await expect(store.load()).rejects.toThrow(SyntaxError);
    await expect(store.append(measurement())).rejects.toThrow(SyntaxError);
    expect(await readFile(filePath,"utf8")).toBe(invalid);
   }finally{await store.close();}
  });
 });
 it("refuses lock contention without changing committed data",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentReliabilityHistory({filePath});
   await store.append(measurement(),{timestamp:1});
   const before=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    await expect(store.append(measurement(),{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
    expect(await readFile(filePath,"utf8")).toBe(before);
   });
   await store.close();
  });
 });
 it("rejects invalid reports and timestamps before modifying storage",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentReliabilityHistory({filePath});
   try{
    await expect(store.append(measurement({passed:99}))).rejects.toThrow();
    await expect(store.append(measurement(),{timestamp:-1})).rejects.toThrow();
    await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
   }finally{await store.close();}
  });
 });
 it("detects failed historical runs and integrity regression",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentReliabilityHistory({filePath});
   try{
    await store.append(measurement(),{timestamp:1});
    await store.append(measurement({passed:99,failed:1,integrityVerified:false,
     errors:[{code:"EIO",count:1}]}),{timestamp:2});
    expect((await store.compareLatest("sigkill")).reasons)
     .toEqual(["FAILURES_INCREASED","INTEGRITY_REGRESSED","STATUS_REGRESSED"]);
   }finally{await store.close();}
  });
 });
});

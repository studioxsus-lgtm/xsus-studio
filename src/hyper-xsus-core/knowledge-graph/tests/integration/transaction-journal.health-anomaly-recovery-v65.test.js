/**
 * Hyper XSUS Core v6.5 — recovery and integrity regression tests.
 * Fail-closed behavior only: no automatic lock stealing or corrupt-data repair.
 */
import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,readdir,rename,open,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {writeAtomicJson} from "../../integration/atomic-json-writer.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";
import {createPersistentAnomalyHistory,PERSISTENT_ANOMALY_HISTORY_VERSION} from "../../integration/transaction-journal-health-anomaly-persistence.js";

const healthy={status:"healthy",anomalyCount:0,anomalies:[]};
const warning={status:"attention",anomalyCount:1,anomalies:[{code:"LOCK_PRESENT",severity:"warning",consecutive:1,repeated:false}]};
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anomaly-recovery-v65-"));
 try{await run(join(dir,"history.json"),dir);}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function committed(filePath){
 const store=createPersistentAnomalyHistory({filePath});
 try{await store.append(healthy,{timestamp:1});}
 finally{await store.close();}
 return readFile(filePath,"utf8");
}
describe("Hyper XSUS Core — persistent anomaly recovery & integrity v6.5.0",()=>{
 it("rejects truncated JSON without overwriting it on load or append",async()=>{
  await fixture(async filePath=>{
   await committed(filePath);
   const truncated='{"version":"6.4.0","entries":[';
   await writeFile(filePath,truncated);
   const store=createPersistentAnomalyHistory({filePath});
   try{
    await expect(store.load()).rejects.toThrow(SyntaxError);
    await expect(store.append(warning,{timestamp:2})).rejects.toThrow(SyntaxError);
    expect(await readFile(filePath,"utf8")).toBe(truncated);
   }finally{await store.close();}
  });
 });
 it("rejects incompatible schema and invalid entries without repair",async()=>{
  await fixture(async filePath=>{
   const original=await committed(filePath);
   for(const corrupted of [
    {version:"0.0.0",entries:[]},
    {version:PERSISTENT_ANOMALY_HISTORY_VERSION,entries:[{timestamp:2,status:"critical",anomalyCount:0,anomalies:[]}]},
    {version:PERSISTENT_ANOMALY_HISTORY_VERSION,entries:[{timestamp:-1,status:"healthy",anomalyCount:0,anomalies:[]}]},
   ]){
    const bytes=JSON.stringify(corrupted);
    await writeFile(filePath,bytes);
    const store=createPersistentAnomalyHistory({filePath});
    try{
     await expect(store.load()).rejects.toThrow();
     await expect(store.append(healthy,{timestamp:3})).rejects.toThrow();
     expect(await readFile(filePath,"utf8")).toBe(bytes);
    }finally{await store.close();}
   }
   expect(original).toContain('"version":"6.4.0"');
  });
 });
 it("keeps committed bytes after injected pre-rename failure and cleans temporary file",async()=>{
  await fixture(async(filePath,dir)=>{
   const before=await committed(filePath);
   await expect(writeAtomicJson(filePath,{version:"invalid"},{
    io:{rename:async()=>{throw Object.assign(new Error("injected rename failure"),{code:"EIO"});}}
   })).rejects.toMatchObject({code:"EIO"});
   expect(await readFile(filePath,"utf8")).toBe(before);
   expect((await readdir(dir)).filter(name=>name.endsWith(".tmp"))).toEqual([]);
  });
 });
 it("keeps committed bytes after injected temp write failure",async()=>{
  await fixture(async(filePath,dir)=>{
   const before=await committed(filePath);
   await expect(writeAtomicJson(filePath,{version:"invalid"},{
    io:{open:async(path,flags,...rest)=>{
     const handle=await open(path,flags,...rest);
     if(flags==="wx")handle.writeFile=async()=>{throw new Error("injected write failure");};
     return handle;
    }}
   })).rejects.toThrow("injected write failure");
   expect(await readFile(filePath,"utf8")).toBe(before);
   expect((await readdir(dir)).filter(name=>name.endsWith(".tmp"))).toEqual([]);
  });
 });
 it("fails closed with a held lock and preserves the owner lock",async()=>{
  await fixture(async filePath=>{
   const before=await committed(filePath);
   await withExclusiveFileLock(filePath,async()=>{
    const owner=await readFile(filePath+".lock","utf8");
    const contender=createPersistentAnomalyHistory({filePath});
    try{await expect(contender.append(warning,{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});}
    finally{await contender.close();}
    expect(await readFile(filePath+".lock","utf8")).toBe(owner);
    expect(await readFile(filePath,"utf8")).toBe(before);
   });
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  });
 });
 it("refuses orphan lock without automatic stealing",async()=>{
  await fixture(async filePath=>{
   const before=await committed(filePath);
   const lockPath=filePath+".lock";
   await writeFile(lockPath,JSON.stringify({pid:0,token:"orphan"}));
   const store=createPersistentAnomalyHistory({filePath});
   try{await expect(store.append(warning,{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});}
   finally{await store.close();}
   expect(await readFile(lockPath,"utf8")).toContain("orphan");
   expect(await readFile(filePath,"utf8")).toBe(before);
  });
 });
 it("restores committed history after reopening and tolerates a failed validation attempt",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentAnomalyHistory({filePath,maxEntries:3});
   await store.append(healthy,{timestamp:10});
   await expect(store.append({status:"critical",anomalyCount:0,anomalies:[]},{timestamp:11})).rejects.toThrow();
   await store.append(warning,{timestamp:12});
   await store.close();
   const bytes=await readFile(filePath,"utf8");
   const restarted=createPersistentAnomalyHistory({filePath,maxEntries:3});
   try{
    expect((await restarted.load()).map(x=>x.timestamp)).toEqual([10,12]);
    expect(await readFile(filePath,"utf8")).toBe(bytes);
   }finally{await restarted.close();}
  });
 });
 it("serializes simultaneous appends from separate stores through file locking or explicit contention",async()=>{
  await fixture(async filePath=>{
   await committed(filePath);
   const a=createPersistentAnomalyHistory({filePath});
   const b=createPersistentAnomalyHistory({filePath});
   try{
    const results=await Promise.allSettled([
     a.append(warning,{timestamp:2}),b.append(healthy,{timestamp:3})
    ]);
    const successes=results.filter(x=>x.status==="fulfilled").length;
    expect(successes).toBeGreaterThanOrEqual(1);
    for(const failed of results.filter(x=>x.status==="rejected"))
     expect(failed.reason.code).toBe("XSUS_FILE_LOCK_BUSY");
    const stored=await a.load();
    expect(stored.length).toBe(1+successes);
    expect(stored[0].timestamp).toBe(1);
   }finally{await a.close();await b.close();}
  });
 });
});

/**
 * Hyper XSUS Core v7.0.0 — integration milestone verification.
 * Two independent stores: no cross-file transaction or implied power-loss durability.
 */
import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentAnomalyHistory} from "../../integration/transaction-journal-health-anomaly-persistence.js";
import {createPersistentReliabilityHistory} from "../../integration/transaction-journal-reliability-persistence.js";
import {summarizeReliabilityReports} from "../../integration/transaction-journal-reliability-reporting.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";
const healthy={status:"healthy",anomalyCount:0,anomalies:[]};
const warning={status:"attention",anomalyCount:1,anomalies:[{code:"LOCK_PRESENT",severity:"warning",consecutive:1,repeated:false}]};
const measurement=(extra={})=>({testId:"xsus-integrity",mode:"custom",operations:10,passed:10,
 failed:0,elapsedMs:100,integrityVerified:true,powerLossVerified:false,
 revision:null,errors:[],...extra});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-milestone-v70-"));
 try{await fn(join(dir,"anomalies.json"),join(dir,"reliability.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — reliability and integrity milestone v7.0.0",()=>{
 it("persists both independent histories and reopens them without losing committed entries",async()=>{
  await fixture(async(aPath,rPath)=>{
   const a=createPersistentAnomalyHistory({filePath:aPath});
   const r=createPersistentReliabilityHistory({filePath:rPath});
   try{
    await a.append(healthy,{timestamp:1});
    await a.append(warning,{timestamp:2});
    await r.append(measurement(),{timestamp:3});
    await r.append(measurement({elapsedMs:200}),{timestamp:4});
   }finally{await a.close();await r.close();}
   const a2=createPersistentAnomalyHistory({filePath:aPath});
   const r2=createPersistentReliabilityHistory({filePath:rPath});
   try{
    expect((await a2.load()).map(x=>x.timestamp)).toEqual([1,2]);
    expect((await r2.load()).map(x=>x.timestamp)).toEqual([3,4]);
    expect((await r2.compareLatest("xsus-integrity")).reasons).toEqual(["DURATION_REGRESSED"]);
    expect(summarizeReliabilityReports((await r2.load()).map(x=>x.report)))
     .toMatchObject({reportCount:2,operations:20,failed:0,status:"passed"});
   }finally{await a2.close();await r2.close();}
  });
 });
 it("keeps reliability history untouched when anomaly history is corrupt",async()=>{
  await fixture(async(aPath,rPath)=>{
   const r=createPersistentReliabilityHistory({filePath:rPath});
   await r.append(measurement(),{timestamp:1});await r.close();
   const before=await readFile(rPath,"utf8");
   await writeFile(aPath,'{"version":"6.4.0","entries":[');
   const a=createPersistentAnomalyHistory({filePath:aPath});
   const reopened=createPersistentReliabilityHistory({filePath:rPath});
   try{
    await expect(a.load()).rejects.toThrow(SyntaxError);
    await expect(a.append(healthy,{timestamp:2})).rejects.toThrow(SyntaxError);
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1]);
    expect(await readFile(rPath,"utf8")).toBe(before);
   }finally{await a.close();await reopened.close();}
  });
 });
 it("keeps anomaly history untouched when reliability history is corrupt",async()=>{
  await fixture(async(aPath,rPath)=>{
   const a=createPersistentAnomalyHistory({filePath:aPath});
   await a.append(healthy,{timestamp:1});await a.close();
   const before=await readFile(aPath,"utf8");
   await writeFile(rPath,'{"version":"6.9.0","entries":[');
   const r=createPersistentReliabilityHistory({filePath:rPath});
   const reopened=createPersistentAnomalyHistory({filePath:aPath});
   try{
    await expect(r.load()).rejects.toThrow(SyntaxError);
    await expect(r.append(measurement(),{timestamp:2})).rejects.toThrow(SyntaxError);
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1]);
    expect(await readFile(aPath,"utf8")).toBe(before);
   }finally{await r.close();await reopened.close();}
  });
 });
 it("refuses held locks independently without altering committed bytes",async()=>{
  await fixture(async(aPath,rPath)=>{
   const a=createPersistentAnomalyHistory({filePath:aPath});
   const r=createPersistentReliabilityHistory({filePath:rPath});
   try{
    await a.append(healthy,{timestamp:1});
    await r.append(measurement(),{timestamp:1});
    const beforeA=await readFile(aPath,"utf8");
    const beforeR=await readFile(rPath,"utf8");
    await withExclusiveFileLock(aPath,async()=>{
     await expect(a.append(warning,{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
     await r.append(measurement(),{timestamp:2});
    });
    expect(await readFile(aPath,"utf8")).toBe(beforeA);
    expect(await readFile(rPath,"utf8")).not.toBe(beforeR);
    await withExclusiveFileLock(rPath,async()=>{
     await expect(r.append(measurement(),{timestamp:3})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
    });
    expect((await a.load()).map(x=>x.timestamp)).toEqual([1]);
    expect((await r.load()).map(x=>x.timestamp)).toEqual([1,2]);
   }finally{await a.close();await r.close();}
  });
 });
 it("rejects incompatible persisted versions and does not repair either file",async()=>{
  await fixture(async(aPath,rPath)=>{
   const badA=JSON.stringify({version:"0.0.0",entries:[]});
   const badR=JSON.stringify({version:"0.0.0",entries:[]});
   await writeFile(aPath,badA);await writeFile(rPath,badR);
   const a=createPersistentAnomalyHistory({filePath:aPath});
   const r=createPersistentReliabilityHistory({filePath:rPath});
   try{
    await expect(a.load()).rejects.toThrow(TypeError);
    await expect(r.load()).rejects.toThrow(TypeError);
    expect(await readFile(aPath,"utf8")).toBe(badA);
    expect(await readFile(rPath,"utf8")).toBe(badR);
   }finally{await a.close();await r.close();}
  });
 });
 it("retains bounded histories independently after 50 operations per store",async()=>{
  await fixture(async(aPath,rPath)=>{
   const a=createPersistentAnomalyHistory({filePath:aPath,maxEntries:10});
   const r=createPersistentReliabilityHistory({filePath:rPath,maxEntries:7});
   try{
    for(let i=1;i<=50;i++){
     await a.append(i%2?healthy:warning,{timestamp:i});
     await r.append(measurement(),{timestamp:i});
    }
    expect((await a.load()).map(x=>x.timestamp)).toEqual(Array.from({length:10},(_,i)=>41+i));
    expect((await r.load()).map(x=>x.timestamp)).toEqual(Array.from({length:7},(_,i)=>44+i));
    await expect(stat(aPath+".lock")).rejects.toMatchObject({code:"ENOENT"});
    await expect(stat(rPath+".lock")).rejects.toMatchObject({code:"ENOENT"});
   }finally{await a.close();await r.close();}
  });
 });
});

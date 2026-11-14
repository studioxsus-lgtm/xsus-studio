/**
 * Hyper XSUS Core v6.7 — 100 real post-commit SIGKILL/restart cycles
 * and cross-instance consistency stress. POSIX process tests only.
 * Does not establish power-loss or network-filesystem durability.
 */
import {describe,it,expect} from "vitest";
import {fork} from "node:child_process";
import {mkdtemp,rm,readFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {createPersistentAnomalyHistory} from "../../integration/transaction-journal-health-anomaly-persistence.js";

const worker=fileURLToPath(new URL("./fixtures/anomaly-crash-v66.worker.js",import.meta.url));
const healthy={status:"healthy",anomalyCount:0,anomalies:[]};
const warning={status:"attention",anomalyCount:1,anomalies:[{code:"LOCK_PRESENT",severity:"warning",consecutive:1,repeated:false}]};
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anomaly-stress-v67-"));
 try{await fn(join(dir,"history.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function load(filePath,maxEntries=100){
 const store=createPersistentAnomalyHistory({filePath,maxEntries});
 try{return await store.load();}finally{await store.close();}
}
async function append(filePath,evaluation,timestamp,maxEntries=100){
 const store=createPersistentAnomalyHistory({filePath,maxEntries});
 try{return await store.append(evaluation,{timestamp});}finally{await store.close();}
}
async function killAfterCommit(filePath){
 const child=fork(worker,["committed",filePath],{stdio:["ignore","ignore","ignore","ipc"]});
 let timer,finished=false;
 try{
  await new Promise((resolve,reject)=>{
   const finish=(error)=>{
    if(finished)return;
    finished=true;
    error?reject(error):resolve();
   };
   timer=setTimeout(()=>finish(new Error("Worker commit checkpoint timed out")),15000);
   child.once("error",finish);
   child.once("exit",(code,signal)=>finish(new Error("Worker exited before checkpoint: "+code+"/"+signal)));
   child.on("message",message=>{
    if(message.stage==="committed")finish();
    if(message.stage==="error")finish(new Error(message.message));
   });
  });
  const exit=new Promise((resolve,reject)=>{
   child.once("exit",(code,signal)=>resolve({code,signal}));
   child.once("error",reject);
  });
  if(!child.kill("SIGKILL"))throw new Error("Unable to send SIGKILL");
  expect(await exit).toEqual({code:null,signal:"SIGKILL"});
 }finally{
  clearTimeout(timer);
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
  if(child.connected)child.disconnect();
 }
}
describe.skipIf(process.platform==="win32")("Hyper XSUS Core — crash consistency stress v6.7.0",()=>{
 it("survives 100 independent post-commit SIGKILL/restart cycles without loss or duplication",async()=>{
  const started=Date.now();
  for(let cycle=1;cycle<=100;cycle++){
   await fixture(async filePath=>{
    await append(filePath,healthy,1);
    await killAfterCommit(filePath);
    const bytes=await readFile(filePath,"utf8");
    const digest=sha(bytes);
    const entries=await load(filePath);
    expect(entries.map(entry=>entry.timestamp)).toEqual([1,2]);
    expect(new Set(entries.map(entry=>entry.timestamp)).size).toBe(2);
    expect(sha(await readFile(filePath,"utf8"))).toBe(digest);
    await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
   });
  }
  const summary={cycles:100,passed:100,elapsedMs:Date.now()-started,
   mode:"post-commit-SIGKILL",powerLossVerified:false};
  expect(summary.passed).toBe(summary.cycles);
  console.info("XSUS v6.7 crash stress summary",JSON.stringify(summary));
 },240000);
 it("serializes 200 appends from two independent store instances without duplicates",async()=>{
  await fixture(async filePath=>{
   const a=createPersistentAnomalyHistory({filePath,maxEntries:300});
   const b=createPersistentAnomalyHistory({filePath,maxEntries:300});
   const pending=[];
   for(let i=1;i<=200;i++){
    const store=i%2?a:b;
    pending.push((async()=>{
     // Competing processes/instances must fail closed; bounded retry is caller-controlled.
     for(let attempt=0;attempt<300;attempt++){
      try{return await store.append(i%2?warning:healthy,{timestamp:i});}
      catch(error){
       if(error?.code!=="XSUS_FILE_LOCK_BUSY")throw error;
       await new Promise(resolve=>setTimeout(resolve,Math.min(20,1+attempt)));
      }
     }
     throw new Error("Exceeded explicit contention retry budget");
    })());
   }
   try{
    await Promise.all(pending);
    const entries=await a.load();
    expect(entries).toHaveLength(200);
    expect(new Set(entries.map(entry=>entry.timestamp)).size).toBe(200);
    expect([...entries.map(entry=>entry.timestamp)].sort((x,y)=>x-y))
     .toEqual(Array.from({length:200},(_,i)=>i+1));
    const parsed=JSON.parse(await readFile(filePath,"utf8"));
    expect(parsed.entries).toHaveLength(200);
   }finally{await a.close();await b.close();}
  });
 },120000);
 it("preserves bounded committed history across 300 sequential appends and restart",async()=>{
  await fixture(async filePath=>{
   const store=createPersistentAnomalyHistory({filePath,maxEntries:25});
   try{
    for(let i=1;i<=300;i++)await store.append(i%2?warning:healthy,{timestamp:i});
   }finally{await store.close();}
   const bytes=await readFile(filePath,"utf8");
   const entries=await load(filePath,25);
   expect(entries.map(x=>x.timestamp)).toEqual(Array.from({length:25},(_,i)=>276+i));
   expect(new Set(entries.map(x=>x.timestamp)).size).toBe(25);
   expect(sha(await readFile(filePath,"utf8"))).toBe(sha(bytes));
  });
 },120000);
});

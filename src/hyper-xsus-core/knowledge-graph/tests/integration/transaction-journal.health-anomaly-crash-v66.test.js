/**
 * Hyper XSUS Core v6.6 — real SIGKILL process interruption regression.
 * Local POSIX semantics only; does not assert power-loss durability.
 */
import {describe,it,expect} from "vitest";
import {fork} from "node:child_process";
import {once} from "node:events";
import {mkdtemp,rm,readFile,readdir,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createPersistentAnomalyHistory} from "../../integration/transaction-journal-health-anomaly-persistence.js";

const worker=fileURLToPath(new URL("./fixtures/anomaly-crash-v66.worker.js",import.meta.url));
const healthy={status:"healthy",anomalyCount:0,anomalies:[]};
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anomaly-crash-v66-"));
 try{await run(join(dir,"history.json"),dir);}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function seed(filePath){
 const store=createPersistentAnomalyHistory({filePath});
 try{await store.append(healthy,{timestamp:1});}
 finally{await store.close();}
 return readFile(filePath,"utf8");
}
async function crashAt(mode,filePath,stage){
 const child=fork(worker,[mode,filePath],{stdio:["ignore","ignore","pipe","ipc"]});
 let timeout;
 try{
  await new Promise((resolve,reject)=>{
   timeout=setTimeout(()=>reject(new Error("Timed out waiting for crash checkpoint: "+stage)),12000);
   child.on("error",reject);
   child.on("exit",(code,signal)=>reject(new Error("Child exited before checkpoint: "+code+"/"+signal)));
   child.on("message",message=>{
    if(message.stage==="error")reject(new Error(message.message));
    if(message.stage===stage)resolve();
   });
  });
  const exited=once(child,"exit");
  child.kill("SIGKILL");
  const [code,signal]=await exited;
  expect(signal).toBe("SIGKILL");
  expect(code).toBe(null);
 }finally{
  clearTimeout(timeout);
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
  child.disconnect?.();
 }
}
describe.skipIf(process.platform==="win32")("Hyper XSUS Core — SIGKILL crash recovery v6.6.0",()=>{
 it("preserves committed bytes when a lock owner is killed",async()=>{
  await fixture(async filePath=>{
   const before=await seed(filePath);
   await crashAt("hold-lock",filePath,"locked");
   expect(await readFile(filePath,"utf8")).toBe(before);
   const store=createPersistentAnomalyHistory({filePath});
   try{
    expect((await store.load()).map(x=>x.timestamp)).toEqual([1]);
    await expect(store.append(healthy,{timestamp:3})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
   }finally{await store.close();}
   expect(JSON.parse(await readFile(filePath+".lock","utf8")).pid).toBeGreaterThan(0);
  });
 },25000);
 it("does not replace committed JSON when killed after temp file sync but before rename",async()=>{
  await fixture(async(filePath,dir)=>{
   const before=await seed(filePath);
   await crashAt("hold-pre-rename",filePath,"temp-synced");
   expect(await readFile(filePath,"utf8")).toBe(before);
   expect((await readdir(dir)).some(name=>name.endsWith(".tmp"))).toBe(true);
   const store=createPersistentAnomalyHistory({filePath});
   try{
    expect((await store.load()).map(x=>x.timestamp)).toEqual([1]);
    await expect(store.append(healthy,{timestamp:3})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
   }finally{await store.close();}
  });
 },25000);
 it("retains a fully committed append after SIGKILL and process restart",async()=>{
  await fixture(async filePath=>{
   await seed(filePath);
   await crashAt("committed",filePath,"committed");
   const reopened=createPersistentAnomalyHistory({filePath});
   try{expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2]);}
   finally{await reopened.close();}
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  });
 },25000);
 it("repeats post-commit SIGKILL and restart checks across independent files",async()=>{
  for(let i=0;i<5;i++)await fixture(async filePath=>{
   await seed(filePath);
   await crashAt("committed",filePath,"committed");
   const reopened=createPersistentAnomalyHistory({filePath});
   try{expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2]);}
   finally{await reopened.close();}
  });
 },90000);
});

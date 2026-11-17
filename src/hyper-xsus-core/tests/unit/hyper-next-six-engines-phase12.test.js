import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,readFile,readdir,stat,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";

const writerUrl=new URL("../../knowledge-graph/integration/atomic-json-writer.js",import.meta.url).href;
const storeUrl=new URL("../../next-engines/orchestration/persistent-decision-journal.js",import.meta.url).href;
const coordinatorUrl=new URL("../../next-engines/orchestration/index.js",import.meta.url).href;
function request(id){return {contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Example",evidence:[]}}},context:{principalId:"test",traceId:"trace-12",authorizationRef:"policy:test"}};}
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),"xsus-phase12-"));try{await run(dir,join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
const workerCode=`
import {writeAtomicJson} from ${JSON.stringify(writerUrl)};
import {createPersistentDecisionJournalStore} from ${JSON.stringify(storeUrl)};
import {coordinateSixEngines} from ${JSON.stringify(coordinatorUrl)};
const filePath=process.argv[1],requestId=process.argv[2];
const atomicWriter=(path,payload)=>writeAtomicJson(path,payload,{io:{
  rename:async()=>{process.stdout.write("BEFORE_RENAME\\n");await new Promise(()=>{});}
}});
const store=createPersistentDecisionJournalStore({filePath,atomicWriter});
await store.save(coordinateSixEngines({contractVersion:"1.0.0",requestId,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Example",evidence:[]}}},context:{principalId:"test",traceId:"trace-12",authorizationRef:"policy:test"}}));
`;
async function killBeforeRename(filePath,id){
 const child=spawn(process.execPath,["--input-type=module","-e",workerCode,filePath,id],{stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="";
 child.stdout.on("data",chunk=>stdout+=chunk.toString());
 child.stderr.on("data",chunk=>stderr+=chunk.toString());
 try{
  await new Promise((resolve,reject)=>{
   let settled=false;
   const done=(error)=>{if(settled)return;settled=true;clearInterval(poll);clearTimeout(timeout);if(error)reject(error);else resolve();};
   const poll=setInterval(()=>{if(stdout.includes("BEFORE_RENAME\n"))done();else if(child.exitCode!==null||child.signalCode!==null)done(new Error("Worker exited before rename: "+stderr));},10);
   const timeout=setTimeout(()=>done(new Error("Timeout waiting for rename barrier: "+stderr)),15000);
  });
 }finally{
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
  await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once("close",resolve);});
 }
 expect(stdout).toContain("BEFORE_RENAME");
}
describe("Hyper six engines phase 12 — real pre-rename process termination",()=>{
 it("retains a committed journal when a competing writer is killed before rename",async()=>fixture(async(dir,filePath)=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(request("committed")));
  const original=await readFile(filePath,"utf8");
  // The competing writer cannot overwrite the existing request; the lock and conflict checks reject it.
  // To test the actual pre-rename barrier, use a separate, initially absent journal.
  const pendingPath=join(dir,"pending.json");
  await killBeforeRename(pendingPath,"pending");
  expect(await readFile(filePath,"utf8")).toBe(original);
  expect((await store.load()).journal.requestId).toBe("committed");
  await expect(stat(pendingPath)).rejects.toMatchObject({code:"ENOENT"});
  await expect(stat(pendingPath+".lock")).resolves.toBeDefined();
  const files=await readdir(dir);
  expect(files.some(name=>name.startsWith(".pending.json.")&&name.endsWith(".tmp"))).toBe(true);
 }));
 it("fails closed on stale lock and permits manual cleanup in isolated test directory",async()=>fixture(async(dir,filePath)=>{
  await killBeforeRename(filePath,"interrupted");
  const store=createPersistentDecisionJournalStore({filePath});
  await expect(store.load()).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
  await unlink(filePath+".lock"); // Test-only explicit operator cleanup, never automatic production lock stealing.
  expect(await store.load()).toBeNull();
  await store.save(coordinateSixEngines(request("recovered-manually")));
  expect((await store.load()).journal.requestId).toBe("recovered-manually");
 }));
});

import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,readFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const storeUrl=new URL("../../next-engines/orchestration/persistent-decision-journal.js",import.meta.url).href;
const coordinatorUrl=new URL("../../next-engines/orchestration/index.js",import.meta.url).href;
function req(id="phase10"){return {contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Example",evidence:[]}}},context:{principalId:"tester",traceId:"trace-phase10",authorizationRef:"policy:test"}};}
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase10-"));try{await fn(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
const workerScript=`
import {createPersistentDecisionJournalStore} from ${JSON.stringify(storeUrl)};
import {coordinateSixEngines} from ${JSON.stringify(coordinatorUrl)};
const filePath=process.argv[1],requestId=process.argv[2];
const store=createPersistentDecisionJournalStore({filePath});
const response=coordinateSixEngines({contractVersion:"1.0.0",requestId,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Example",evidence:[]}}},context:{principalId:"worker",traceId:"trace-worker",authorizationRef:"policy:test"}});
try{await store.save(response);process.stdout.write("COMMITTED\\n");}
catch(e){process.stdout.write("ERROR:"+String(e.code||"UNKNOWN")+"\\n");}
`;
function spawnWorker(filePath,id){
 const child=spawn(process.execPath,["--input-type=module","-e",workerScript,filePath,id],{stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="";
 child.stdout.on("data",b=>stdout+=b.toString());
 child.stderr.on("data",b=>stderr+=b.toString());
 const done=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("Worker timeout: "+stderr));},20000);
   child.once("error",e=>{clearTimeout(timer);reject(e);});
   child.once("close",(code,signal)=>{clearTimeout(timer);if(code!==0)reject(new Error("Worker exited: "+code+"/"+signal+" "+stderr));else resolve(stdout);});
 });
 return {child,done};
}
describe("Hyper six engines phase 10 — process boundaries",()=>{
 it("retains committed journal after writer exits",async()=>fixture(async filePath=>{
   const worker=spawnWorker(filePath,"durable-1");
   expect(await worker.done).toContain("COMMITTED");
   const restored=await createPersistentDecisionJournalStore({filePath}).load();
   expect(restored.journal.requestId).toBe("durable-1");
   expect(restored.executionAuthorized).toBe(false);
   expect(restored.checkpoint.resumeExecution).toBe(false);
 }));
 it("rejects competing writes without corrupting committed bytes",async()=>fixture(async filePath=>{
   const workers=Array.from({length:5},(_,i)=>spawnWorker(filePath,"competitor-"+i));
   const outputs=await Promise.all(workers.map(w=>w.done));
   expect(outputs.filter(s=>s.includes("COMMITTED")).length).toBe(1);
   for(const output of outputs)expect(output.includes("COMMITTED")||output.includes("ERROR:XSUS_FILE_LOCK_BUSY")||output.includes("ERROR:JOURNAL_CONFLICT")).toBe(true);
   const raw=await readFile(filePath,"utf8");
   expect(JSON.parse(raw).digest).toMatch(/^[a-f0-9]{64}$/);
   const restored=await createPersistentDecisionJournalStore({filePath}).load();
   expect(restored.journal.requestId).toMatch(/^competitor-[0-4]$/);
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
 }));
 it("does not permit a second distinct writer after a committed process",async()=>fixture(async filePath=>{
   expect(await spawnWorker(filePath,"first").done).toContain("COMMITTED");
   expect(await spawnWorker(filePath,"second").done).toContain("ERROR:JOURNAL_CONFLICT");
   expect((await createPersistentDecisionJournalStore({filePath}).load()).journal.requestId).toBe("first");
 }));
 it("restores idempotently after a new process instance",async()=>fixture(async filePath=>{
   expect(await spawnWorker(filePath,"same").done).toContain("COMMITTED");
   const before=await readFile(filePath,"utf8");
   expect(await spawnWorker(filePath,"same").done).toContain("COMMITTED");
   expect(await readFile(filePath,"utf8")).toBe(before);
 }));
});

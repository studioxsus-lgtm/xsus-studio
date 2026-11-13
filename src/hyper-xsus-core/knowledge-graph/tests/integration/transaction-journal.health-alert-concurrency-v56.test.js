import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory} from "../../integration/transaction-journal-health-alert-persistence.js";
import {evaluateHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";

const execFileAsync=promisify(execFile);
const moduleUrl=pathToFileURL(resolve("src/hyper-xsus-core/knowledge-graph/integration/transaction-journal-health-alert-persistence.js")).href;
const alertUrl=pathToFileURL(resolve("src/hyper-xsus-core/knowledge-graph/integration/transaction-journal-health-alerting.js")).href;
const evaluation=i=>evaluateHealthHistoryAlerts({
 status:i%2?"missing":"healthy",lockPresent:false,
 entryCount:i%2?null:1,latestLevel:i%2?null:"healthy",
});
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-concurrency-v56-"));
 try{await run({dir,filePath:join(dir,"alerts.json")});}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function childAppend(filePath,index,maxEntries=25){
 const code=`
 import {createPersistentAlertHistory} from ${JSON.stringify(moduleUrl)};
 import {evaluateHealthHistoryAlerts} from ${JSON.stringify(alertUrl)};
 const filePath=process.argv[1],i=Number(process.argv[2]),maxEntries=Number(process.argv[3]);
 const store=createPersistentAlertHistory({filePath,maxEntries});
 try{
   const evaluation=evaluateHealthHistoryAlerts({
     status:i%2?"missing":"healthy",lockPresent:false,
     entryCount:i%2?null:1,latestLevel:i%2?null:"healthy",
   });
   await store.append(evaluation,{timestamp:i});
   process.stdout.write("COMMITTED");
 }catch(error){
   process.stderr.write(error?.code??String(error));
   process.exitCode=2;
 }finally{await store.close();}
 `;
 return execFileAsync(process.execPath,["--input-type=module","-e",code,filePath,String(index),String(maxEntries)],{timeout:20000});
}
describe("Hyper XSUS Core — Persistent Alert History Concurrency & Recovery Stress v5.6.0",()=>{
 it("preserves ordered bounded history through 20 fresh-process appends",async()=>{
  await fixture(async({filePath})=>{
   for(let i=1;i<=20;i++){
    const result=await childAppend(filePath,i,10);
    expect(result.stdout).toBe("COMMITTED");
    if(i%5===0){
     const store=createPersistentAlertHistory({filePath,maxEntries:10});
     try{
      const entries=await store.load();
      expect(entries.map(x=>x.timestamp)).toEqual(Array.from({length:Math.min(i,10)},(_,j)=>i-Math.min(i,10)+j+1));
     }finally{await store.close();}
    }
   }
   const bytes=await readFile(filePath,"utf8");
   const digest=createHash("sha256").update(bytes).digest("hex");
   const fresh=createPersistentAlertHistory({filePath,maxEntries:10});
   try{expect((await fresh.load()).at(-1).timestamp).toBe(20);}
   finally{await fresh.close();}
   expect(createHash("sha256").update(await readFile(filePath,"utf8")).digest("hex")).toBe(digest);
  });
 },180000);
 it("rejects cross-process writes under an owned lock without modifying committed bytes",async()=>{
  await fixture(async({filePath})=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:25});
   await store.append(evaluation(1),{timestamp:1});
   await store.close();
   const before=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    await expect(childAppend(filePath,2)).rejects.toMatchObject({code:2});
    expect(await readFile(filePath,"utf8")).toBe(before);
    await stat(filePath+".lock");
   });
   const result=await childAppend(filePath,3);
   expect(result.stdout).toBe("COMMITTED");
   const fresh=createPersistentAlertHistory({filePath,maxEntries:25});
   try{expect((await fresh.load()).map(x=>x.timestamp)).toEqual([1,3]);}
   finally{await fresh.close();}
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  });
 },60000);
 it("serializes 100 queued writes and reopens without corruption",async()=>{
  await fixture(async({filePath})=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:30});
   const pending=Promise.all(Array.from({length:100},(_,i)=>store.append(evaluation(i+1),{timestamp:i+1})));
   await store.close();
   await pending;
   const fresh=createPersistentAlertHistory({filePath,maxEntries:30});
   try{
    const entries=await fresh.load();
    expect(entries.map(x=>x.timestamp)).toEqual(Array.from({length:30},(_,i)=>71+i));
    expect(entries.every(x=>x.alertCount===x.alerts.length)).toBe(true);
   }finally{await fresh.close();}
  });
 },180000);
});

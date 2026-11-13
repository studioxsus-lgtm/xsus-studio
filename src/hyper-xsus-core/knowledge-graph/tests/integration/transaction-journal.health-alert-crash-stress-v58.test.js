import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,readFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory} from "../../integration/transaction-journal-health-alert-persistence.js";
import {evaluateHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";

const persistenceUrl=new URL("../../integration/transaction-journal-health-alert-persistence.js",import.meta.url).href;
const alertUrl=new URL("../../integration/transaction-journal-health-alerting.js",import.meta.url).href;
const workerCode=[
 'import {createPersistentAlertHistory} from '+JSON.stringify(persistenceUrl)+';',
 'import {evaluateHealthHistoryAlerts} from '+JSON.stringify(alertUrl)+';',
 'const store=createPersistentAlertHistory({filePath:process.argv[1],maxEntries:8});',
 'const i=Number(process.argv[2]);',
 'const evaluation=evaluateHealthHistoryAlerts({status:"missing",lockPresent:false});',
 'await store.append(evaluation,{timestamp:i});',
 'await store.close();',
 'process.stdout.write("COMMITTED\\n");',
 'await new Promise(()=>{});',
].join("\n");
const evaluation=()=>evaluateHealthHistoryAlerts({status:"missing",lockPresent:false});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-crash-stress-v58-"));
 try{await fn(join(dir,"alerts.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function killCommitted(filePath,index){
 const child=spawn(process.execPath,["--input-type=module","-e",workerCode,filePath,String(index)],{stdio:["ignore","pipe","pipe"]});
 let output="",stderr="",settled=false;
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(new Error("Worker marker timeout "+stderr)),20000);
  function finish(error){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();}
  child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.includes("COMMITTED\n"))finish();});
  child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  child.on("error",finish);
  child.on("exit",(code,signal)=>finish(new Error("Worker exited early "+code+" "+signal+" "+stderr)));
 });
 try{
  await ready;
  const closed=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error("Worker kill timeout")),15000);
   child.once("close",(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
  });
  child.kill("SIGKILL");
  const result=await closed;
  expect(result.signal).toBe("SIGKILL");
 }finally{
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
 }
}
describe("Hyper XSUS Core — persistent alert history crash recovery stress v5.8.0",()=>{
 it("survives 10 real post-commit SIGKILL cycles with fresh-process writes and bounded snapshots",async()=>{
  await fixture(async(filePath)=>{
   const seed=createPersistentAlertHistory({filePath,maxEntries:8});
   await seed.append(evaluation(),{timestamp:1});
   await seed.close();
   for(let i=2;i<=11;i++){
    await killCommitted(filePath,i);
    const committed=await readFile(filePath,"utf8");
    const digest=createHash("sha256").update(committed).digest("hex");
    const parsed=JSON.parse(committed);
    expect(parsed.version).toBe("5.4.0");
    expect(parsed.entries.length).toBe(Math.min(i,8));
    const fresh=createPersistentAlertHistory({filePath,maxEntries:8});
    try{
     const entries=await fresh.load();
     expect(entries.map(x=>x.timestamp)).toEqual(
      Array.from({length:Math.min(i,8)},(_,j)=>i-Math.min(i,8)+j+1)
     );
     expect(entries.every(x=>x.alertCount===x.alerts.length)).toBe(true);
    }finally{await fresh.close();}
    expect(createHash("sha256").update(await readFile(filePath,"utf8")).digest("hex")).toBe(digest);
    await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
   }
   const resumed=createPersistentAlertHistory({filePath,maxEntries:8});
   try{
    await resumed.append(evaluation(),{timestamp:12});
    expect((await resumed.load()).map(x=>x.timestamp)).toEqual([5,6,7,8,9,10,11,12]);
   }finally{await resumed.close();}
  });
 },180000);
});

import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,readFile,stat,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory} from "../../integration/transaction-journal-health-alert-persistence.js";
import {evaluateHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";

const persistenceUrl=new URL("../../integration/transaction-journal-health-alert-persistence.js",import.meta.url).href;
const alertUrl=new URL("../../integration/transaction-journal-health-alerting.js",import.meta.url).href;
const lockUrl=new URL("../../integration/exclusive-file-lock.js",import.meta.url).href;
const committedCode=[
 'import {createPersistentAlertHistory} from '+JSON.stringify(persistenceUrl)+';',
 'import {evaluateHealthHistoryAlerts} from '+JSON.stringify(alertUrl)+';',
 'const store=createPersistentAlertHistory({filePath:process.argv[1]});',
 'const evaluation=evaluateHealthHistoryAlerts({status:"missing",lockPresent:false});',
 'await store.append(evaluation,{timestamp:2});',
 'await store.close();',
 'process.stdout.write("COMMITTED\\n");',
 'await new Promise(()=>{});',
].join("\n");
const holdLockCode=[
 'import {withExclusiveFileLock} from '+JSON.stringify(lockUrl)+';',
 'await withExclusiveFileLock(process.argv[1],async()=>{',
 'process.stdout.write("LOCKED\\n");',
 'await new Promise(()=>{});',
 '});',
].join("\n");
const evaluation=()=>evaluateHealthHistoryAlerts({status:"missing",lockPresent:false});
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-crash-v57-"));
 try{await run(join(dir,"alerts.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function killAfterMarker(code,filePath,marker){
 const child=spawn(process.execPath,["--input-type=module","-e",code,filePath],{stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="",settled=false;
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(new Error("Timeout waiting for "+marker+" "+stderr)),20000);
  function finish(error){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();}
  child.stdout.on("data",chunk=>{stdout+=chunk.toString();if(stdout.includes(marker))finish();});
  child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  child.on("error",finish);
  child.on("exit",(code,signal)=>finish(new Error("Worker exited early: "+code+" "+signal+" "+stderr)));
 });
 try{
  await ready;
  const exited=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error("SIGKILL timeout")),15000);
   child.once("close",(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
  });
  child.kill("SIGKILL");
  const result=await exited;
  expect(result.signal).toBe("SIGKILL");
 }finally{
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
 }
}
describe("Hyper XSUS Core — persistent alert history crash recovery v5.7.0",()=>{
 it("preserves committed alert history after real SIGKILL and permits fresh-process recovery",async()=>{
  await fixture(async(filePath)=>{
   const initial=createPersistentAlertHistory({filePath});
   await initial.append(evaluation(),{timestamp:1});
   await initial.close();
   await killAfterMarker(committedCode,filePath,"COMMITTED\n");
   const bytes=await readFile(filePath,"utf8");
   const hash=createHash("sha256").update(bytes).digest("hex");
   const reopened=createPersistentAlertHistory({filePath});
   try{
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2]);
    expect(createHash("sha256").update(await readFile(filePath,"utf8")).digest("hex")).toBe(hash);
    await reopened.append(evaluation(),{timestamp:3});
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2,3]);
   }finally{await reopened.close();}
   await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  });
 },60000);
 it("fails closed after SIGKILL while lock held; only explicit test cleanup restores writes",async()=>{
  await fixture(async(filePath)=>{
   const initial=createPersistentAlertHistory({filePath});
   await initial.append(evaluation(),{timestamp:1});
   await initial.close();
   const before=await readFile(filePath,"utf8");
   await killAfterMarker(holdLockCode,filePath,"LOCKED\n");
   const lockPath=filePath+".lock";
   const lockBefore=await stat(lockPath);
   const reopened=createPersistentAlertHistory({filePath});
   try{
    expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1]);
    await expect(reopened.append(evaluation(),{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
    expect(await readFile(filePath,"utf8")).toBe(before);
    expect((await stat(lockPath)).ino).toBe(lockBefore.ino);
   }finally{await reopened.close();}
   // Manual cleanup strictly within isolated test fixture, after confirmed SIGKILL.
   await unlink(lockPath);
   const restored=createPersistentAlertHistory({filePath});
   try{
    await restored.append(evaluation(),{timestamp:3});
    expect((await restored.load()).map(x=>x.timestamp)).toEqual([1,3]);
   }finally{await restored.close();}
  });
 },60000);
});

import { describe,it,expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp,rm,readFile,stat,unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPersistentJournalHealthHistory } from "../../integration/transaction-journal-health-persistence.js";

const lockUrl=new URL("../../integration/exclusive-file-lock.js",import.meta.url).href;
const historyUrl=new URL("../../integration/transaction-journal-health-persistence.js",import.meta.url).href;
const holdLockCode=[
  'import { withExclusiveFileLock } from '+JSON.stringify(lockUrl)+';',
  'await withExclusiveFileLock(process.argv[1],async()=>{',
  ' process.stdout.write("LOCKED\\n");',
  ' await new Promise(()=>{setInterval(()=>{},1000);});',
  '});',
].join("\n");
const committedCode=[
  'import { createPersistentJournalHealthHistory } from '+JSON.stringify(historyUrl)+';',
  'const store=createPersistentJournalHealthHistory({filePath:process.argv[1]});',
  'await store.append({level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null},{timestamp:2});',
  'await store.close();',
  'process.stdout.write("COMMITTED\\n");',
  'await new Promise(()=>{setInterval(()=>{},1000);});',
].join("\n");
const report={level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null};
async function fixture(fn){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-crash-v47-"));
  try{await fn(join(dir,"history.json"));}
  finally{await rm(dir,{recursive:true,force:true});}
}
async function startAndKill(code,filePath,marker){
  const child=spawn(process.execPath,["--input-type=module","-e",code,filePath],{stdio:["ignore","pipe","pipe"]});
  let output="",stderr="";
  let settled=false;
  const reached=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new Error("Timeout waiting for "+marker+" "+stderr)),20000);
    function finish(error){if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve();}
    child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.includes(marker))finish();});
    child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
    child.on("error",finish);
    child.on("exit",(code,signal)=>finish(new Error("Worker exited before marker: "+code+" "+signal+" "+stderr)));
  });
  try{
    await reached;
    const exit=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("SIGKILL did not terminate worker")),15000);
      child.once("close",(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
    });
    child.kill("SIGKILL");
    const result=await exit;
    expect(result.signal).toBe("SIGKILL");
  }finally{
    if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
  }
}
describe("Hyper XSUS Core — health history crash recovery v4.7.0",()=>{
  it("keeps a committed snapshot after SIGKILL of a post-commit worker",async()=>{
    await fixture(async(filePath)=>{
      const initial=createPersistentJournalHealthHistory({filePath});
      await initial.append(report,{timestamp:1});
      await initial.close();
      await startAndKill(committedCode,filePath,"COMMITTED\n");
      const reopened=createPersistentJournalHealthHistory({filePath});
      try{
        expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2]);
        await reopened.append(report,{timestamp:3});
        expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1,2,3]);
      }finally{await reopened.close();}
      await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
    });
  },60000);
  it("fails closed on SIGKILL orphan lock; explicit operator cleanup restores writes",async()=>{
    await fixture(async(filePath)=>{
      const initial=createPersistentJournalHealthHistory({filePath});
      await initial.append(report,{timestamp:1});
      await initial.close();
      const before=await readFile(filePath,"utf8");
      await startAndKill(holdLockCode,filePath,"LOCKED\n");
      const lockPath=filePath+".lock";
      const lockBefore=await stat(lockPath);
      const reopened=createPersistentJournalHealthHistory({filePath});
      try{
        expect((await reopened.load()).map(x=>x.timestamp)).toEqual([1]);
        await expect(reopened.append(report,{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
        expect(await readFile(filePath,"utf8")).toBe(before);
        expect((await stat(lockPath)).ino).toBe(lockBefore.ino);
      }finally{await reopened.close();}
      // Test-only manual intervention, after proving the owner process was killed.
      await unlink(lockPath);
      const restored=createPersistentJournalHealthHistory({filePath});
      try{
        await restored.append(report,{timestamp:3});
        expect((await restored.load()).map(x=>x.timestamp)).toEqual([1,3]);
      }finally{await restored.close();}
    });
  },60000);
});

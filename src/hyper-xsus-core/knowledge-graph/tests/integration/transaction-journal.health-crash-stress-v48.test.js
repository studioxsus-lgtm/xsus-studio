import { describe,it,expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp,rm,readFile,stat,unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createPersistentJournalHealthHistory,PERSISTENT_HEALTH_HISTORY_VERSION } from "../../integration/transaction-journal-health-persistence.js";

const historyUrl=new URL("../../integration/transaction-journal-health-persistence.js",import.meta.url).href;
const lockUrl=new URL("../../integration/exclusive-file-lock.js",import.meta.url).href;
const report={level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null};
const committedWorker=[
  'import { createPersistentJournalHealthHistory } from '+JSON.stringify(historyUrl)+';',
  'const store=createPersistentJournalHealthHistory({filePath:process.argv[1]});',
  'await store.append({level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null},{timestamp:Number(process.argv[2])});',
  'await store.close(); process.stdout.write("COMMITTED\\n");',
  'await new Promise(()=>{setInterval(()=>{},1000);});',
].join("\n");
const lockedWorker=[
  'import { withExclusiveFileLock } from '+JSON.stringify(lockUrl)+';',
  'await withExclusiveFileLock(process.argv[1],async()=>{',
  ' process.stdout.write("LOCKED\\n"); await new Promise(()=>{setInterval(()=>{},1000);});',
  '});',
].join("\n");
async function killAfterMarker(code,filePath,timestamp,marker){
  const child=spawn(process.execPath,["--input-type=module","-e",code,filePath,String(timestamp)],{stdio:["ignore","pipe","pipe"]});
  let output="",stderr="",done=false;
  let timer;
  const reached=new Promise((resolve,reject)=>{
    function finish(error){if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve();}
    timer=setTimeout(()=>finish(new Error("Timeout waiting for "+marker+": "+stderr)),20000);
    child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.includes(marker))finish();});
    child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
    child.once("error",finish);
    child.once("exit",(code,signal)=>finish(new Error("Worker exited before marker: "+code+" "+signal+" "+stderr)));
  });
  try{
    await reached;
    const closed=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error("SIGKILL worker exit timeout")),15000);
      child.once("close",(code,signal)=>{clearTimeout(timeout);resolve({code,signal});});
    });
    child.kill("SIGKILL");
    expect((await closed).signal).toBe("SIGKILL");
  }finally{
    if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
  }
}
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-crash-stress-v48-"));
  try{await run(join(dir,"health.json"));}
  finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — health history crash recovery stress v4.8.0",()=>{
  it("preserves all 10 committed snapshots across repeated SIGKILL and fresh-process restarts",async()=>{
    await fixture(async(filePath)=>{
      for(let cycle=1;cycle<=10;cycle++){
        await killAfterMarker(committedWorker,filePath,cycle,"COMMITTED\n");
        const fresh=createPersistentJournalHealthHistory({filePath,maxEntries:100});
        try{
          const entries=await fresh.load();
          expect(entries.map(item=>item.timestamp)).toEqual(Array.from({length:cycle},(_,i)=>i+1));
          const raw=await readFile(filePath,"utf8");
          const parsed=JSON.parse(raw);
          expect(parsed.version).toBe(PERSISTENT_HEALTH_HISTORY_VERSION);
          expect(parsed.entries.length).toBe(cycle);
          expect(createHash("sha256").update(raw).digest("hex")).toMatch(/^[a-f0-9]{64}$/);
          await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
        }finally{await fresh.close();}
      }
    });
  },180000);
  it("keeps committed bytes unchanged through 5 SIGKILL orphan-lock cycles; manual release only",async()=>{
    await fixture(async(filePath)=>{
      const initial=createPersistentJournalHealthHistory({filePath});
      await initial.append(report,{timestamp:1});
      await initial.close();
      for(let cycle=1;cycle<=5;cycle++){
        const before=await readFile(filePath,"utf8");
        await killAfterMarker(lockedWorker,filePath,cycle,"LOCKED\n");
        const lockPath=filePath+".lock";
        const lockIdentity=await stat(lockPath);
        const fresh=createPersistentJournalHealthHistory({filePath});
        try{
          expect((await fresh.load()).map(x=>x.timestamp)).toEqual(Array.from({length:cycle},(_,i)=>i+1));
          await expect(fresh.append(report,{timestamp:cycle+1})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
          expect(await readFile(filePath,"utf8")).toBe(before);
          expect((await stat(lockPath)).ino).toBe(lockIdentity.ino);
        }finally{await fresh.close();}
        // Explicit test-only operator intervention; never automatic stale-lock stealing.
        await unlink(lockPath);
        const restored=createPersistentJournalHealthHistory({filePath});
        try{await restored.append(report,{timestamp:cycle+1});}
        finally{await restored.close();}
      }
      const final=createPersistentJournalHealthHistory({filePath});
      try{expect((await final.load()).map(x=>x.timestamp)).toEqual([1,2,3,4,5,6]);}
      finally{await final.close();}
    });
  },180000);
});

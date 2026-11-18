import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const workerCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(moduleUrl) + ';',
  'const filePath = process.argv[1];',
  'const store = createTransactionJournalStore({filePath,exclusiveLock:true});',
  'process.once("message",async message=>{',
  '  if(message!=="GO")return;',
  '  try {',
  '    const entries=await store.recoverInterrupted();',
  '    await new Promise((resolve,reject)=>process.send({type:"RESULT",ok:true,entries},error=>error?reject(error):resolve()));',
  '  } catch(error) {',
  '    await new Promise((resolve,reject)=>process.send({type:"RESULT",ok:false,code:error.code||"UNEXPECTED"},err=>err?reject(err):resolve()));',
  '  } finally {await store.close();process.disconnect();}',
  '});',
  'process.send({type:"READY"});',
].join("\n");

function launch(filePath) {
  // IPC remains open until the parent sends GO; stdin/stdout scheduling
  // cannot accidentally let a READY worker exit before its assignment.
  const child=spawn(process.execPath,["--input-type=module","-e",workerCode,filePath],
    {stdio:["ignore","pipe","pipe","ipc"]});
  let stderr="";
  child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  let readyResolve,readyReject,resultResolve,resultReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const result=new Promise((resolve,reject)=>{resultResolve=resolve;resultReject=reject;});
  // A worker may fail before run() is called; observe rejection immediately.
  result.catch(()=>{});
  // Attach handlers immediately, before any READY or RESULT can arrive.
  child.on("message",message=>{
    if(message?.type==="READY")readyResolve();
    else if(message?.type==="RESULT")resultResolve(message);
  });
  const failure=error=>{
    readyReject(error);
    resultReject(error);
  };
  child.on("error",failure);
  child.on("exit",(code,signal)=>{
    failure(new Error("Worker exited (code="+code+", signal="+signal+"): stderr="+JSON.stringify(stderr)));
  });
  return {
    child,ready,
    run:async()=>{
      if(!child.connected)throw new Error("Worker IPC disconnected before GO");
      child.send("GO");
      const message=await result;
      const {type,...outcome}=message;
      return outcome;
    },
  };
}

async function scenario(count) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-concurrent-recovery-v35-"));
  const filePath=join(dir,"journal.json");
  const workers=[];
  const expected=[
    {id:1,state:"interrupted",attempted:5,added:2},
    {id:2,state:"completed",attempted:3,added:3},
    {id:3,state:"failed",attempted:1,added:0,error:"expected"},
  ];
  try {
    const store=createTransactionJournalStore({filePath,exclusiveLock:true});
    try {
      await store.save([{...expected[0],state:"running"},expected[1],expected[2]]);
    } finally {await store.close();}
    // Bound simultaneous Node processes in CI while retaining lock contention
    // within each wave. All count attempts still execute and are verified.
    const results=[];
    const waveSize=10;
    for(let offset=0;offset<count;offset+=waveSize) {
      const wave=Array.from({length:Math.min(waveSize,count-offset)},()=>launch(filePath));
      workers.push(...wave);
      await Promise.all(wave.map(worker=>worker.ready));
      results.push(...await Promise.all(wave.map(worker=>worker.run())));
    }
    const successful=results.filter(result=>result.ok);
    const busy=results.filter(result=>!result.ok&&result.code==="XSUS_FILE_LOCK_BUSY");
    expect(successful.length).toBeGreaterThanOrEqual(1);
    expect(successful.length+busy.length).toBe(count);
    for(const result of successful)expect(result.entries).toEqual(expected);
    const raw=await readFile(filePath,"utf8");
    expect(JSON.parse(raw)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:expected});
    const verifier=createTransactionJournalStore({filePath,exclusiveLock:true});
    try {
      const snapshot=await verifier.loadWithRevision();
      expect(snapshot.entries).toEqual(expected);
      expect(snapshot.revision).toBe(createHash("sha256").update(raw).digest("hex"));
      expect(await verifier.recoverInterrupted()).toEqual(expected);
      expect(await readFile(filePath,"utf8")).toBe(raw);
    } finally {await verifier.close();}
    await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
  } finally {
    for(const worker of workers) {
      if(worker.child.exitCode===null&&worker.child.signalCode===null)worker.child.kill("SIGKILL");
    }
    await rm(dir,{recursive:true,force:true});
  }
}

describe("Hyper XSUS Core — concurrent recovery lock safety v3.5.0",()=>{
  for(const count of [10,25,50]) {
    it("preserves journal across "+count+" recovery attempts (up to 10 competing per wave)",
      async()=>{await scenario(count);},180000);
  }
});

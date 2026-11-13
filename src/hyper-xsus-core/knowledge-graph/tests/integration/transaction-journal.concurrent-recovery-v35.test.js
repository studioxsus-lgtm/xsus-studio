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
  'process.stdout.write("READY\\n");',
  'process.stdin.once("data",async()=>{',
  '  try {',
  '    const entries=await store.recoverInterrupted();',
  '    process.stdout.write("RESULT:"+JSON.stringify({ok:true,entries})+"\\n");',
  '  } catch(error) {',
  '    process.stdout.write("RESULT:"+JSON.stringify({ok:false,code:error.code||"UNEXPECTED"})+"\\n");',
  '  } finally {await store.close();}',
  '});',
].join("\n");

function launch(filePath) {
  const child=spawn(process.execPath,["--input-type=module","-e",workerCode,filePath],
    {stdio:["pipe","pipe","pipe"]});
  let output="",stderr="";
  child.stdout.on("data",chunk=>{output+=chunk.toString();});
  child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  function waitFor(marker) {
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(new Error("Timeout waiting for "+marker+": "+stderr)),90000);
      const poll=setInterval(()=>{
        if(output.includes(marker))finish(null,output);
        else if(child.exitCode!==null || child.signalCode!==null)
          finish(new Error("Worker exited early: "+stderr));
      },10);
      function finish(error,value) {
        clearTimeout(timer);clearInterval(poll);
        if(error)reject(error);else resolve(value);
      }
    });
  }
  return {
    child,ready:waitFor("READY\n"),
    run:async()=>{
      const pending=waitFor("RESULT:");
      child.stdin.end("GO\n");
      const data=await pending;
      const line=data.split("\n").find(line=>line.startsWith("RESULT:"));
      return JSON.parse(line.slice(7));
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
    // Bound simultaneous Node processes in CI while retaining lock contention\n    // within each wave. All count attempts still execute and are verified.\n    const results=[];\n    const waveSize=10;\n    for(let offset=0;offset<count;offset+=waveSize) {\n      const wave=Array.from({length:Math.min(waveSize,count-offset)},()=>launch(filePath));\n      workers.push(...wave);\n      await Promise.all(wave.map(worker=>worker.ready));\n      results.push(...await Promise.all(wave.map(worker=>worker.run())));\n    }
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

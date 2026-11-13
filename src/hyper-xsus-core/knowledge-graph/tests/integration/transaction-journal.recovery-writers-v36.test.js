import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const moduleUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const workerCode = [
  'import { createTransactionJournalStore } from '+JSON.stringify(moduleUrl)+';',
  'const [filePath,mode,id,revision]=process.argv.slice(1);',
  'const store=createTransactionJournalStore({filePath,exclusiveLock:true});',
  'process.stdout.write("READY\\n");',
  'process.stdin.once("data",async()=>{',
  'try {',
  '  if(mode==="recover") await store.recoverInterrupted();',
  '  else await store.saveIfRevision([{id:1,state:"completed",attempted:1,added:1},{id:Number(id),state:"completed",attempted:2,added:2}],revision);',
  '  process.stdout.write("RESULT:success\\n");',
  '} catch(error) {process.stdout.write("RESULT:"+(error.code||"unexpected")+"\\n");}',
  'finally {await store.close();}',
  '});',
].join("\n");

function launch(filePath,mode,id,revision) {
  const child=spawn(process.execPath,["--input-type=module","-e",workerCode,filePath,mode,String(id),revision],
    {stdio:["pipe","pipe","pipe"]});
  let output="",stderr="";
  child.stdout.on("data",chunk=>{output+=chunk.toString();});
  child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  const waitFor=(marker)=>new Promise((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>finish(new Error("Timeout: "+stderr)),90000);
    function finish(error,value){
      if(settled)return;settled=true;clearTimeout(timer);
      child.stdout.off("data",onData);child.off("error",onError);child.off("close",onClose);
      if(error)reject(error);else resolve(value);
    }
    function onData(){if(output.includes(marker))finish(null,output);}
    function onError(error){finish(error);}
    function onClose(code,signal){finish(new Error("Early exit "+code+"/"+signal+" "+stderr));}
    child.stdout.on("data",onData);child.on("error",onError);child.on("close",onClose);
    if(output.includes(marker))finish(null,output);
  });
  return {
    child,ready:waitFor("READY\n"),
    run:async()=>{
      const result=waitFor("RESULT:");
      child.stdin.end("GO\n");
      const line=(await result).split("\n").find(x=>x.startsWith("RESULT:"));
      return line.slice(7);
    },
  };
}

async function scenario(count){
  const dir=await mkdtemp(join(tmpdir(),"xsus-recovery-writers-v36-"));
  const filePath=join(dir,"journal.json");
  const workers=[];
  const baseline=[{id:1,state:"running",attempted:1,added:1}];
  try {
    const store=createTransactionJournalStore({filePath,exclusiveLock:true});
    let revision;
    try {
      await store.save(baseline);
      revision=(await store.loadWithRevision()).revision;
    } finally {await store.close();}
    for(let i=0;i<count;i++){
      const mode=i%2===0?"recover":"writer";
      workers.push(launch(filePath,mode,i+2,revision));
    }
    await Promise.all(workers.map(w=>w.ready));
    const results=await Promise.all(workers.map(w=>w.run()));
    expect(results.filter(r=>r==="success").length).toBeGreaterThanOrEqual(1);
    expect(results.every(r=>["success","XSUS_FILE_LOCK_BUSY","XSUS_JOURNAL_REVISION_CONFLICT"].includes(r))).toBe(true);
    expect(results.filter((r,i)=>i%2===1&&r==="success").length).toBeLessThanOrEqual(1);
    const raw=await readFile(filePath,"utf8");
    const parsed=JSON.parse(raw);
    expect(parsed.version).toBe(TRANSACTION_JOURNAL_VERSION);
    const winningWriter=results.findIndex((r,i)=>i%2===1&&r==="success");
    if(winningWriter>=0){
      expect(parsed.entries).toEqual([
        {id:1,state:"completed",attempted:1,added:1},
        {id:winningWriter+2,state:"completed",attempted:2,added:2},
      ]);
    }else{
      expect(parsed.entries).toEqual([{id:1,state:"interrupted",attempted:1,added:1}]);
    }
    const verifier=createTransactionJournalStore({filePath,exclusiveLock:true});
    try {
      const snapshot=await verifier.loadWithRevision();
      expect(snapshot.entries).toEqual(parsed.entries);
      expect(snapshot.revision).toBe(createHash("sha256").update(raw).digest("hex"));
      expect(await verifier.recoverInterrupted()).toEqual(parsed.entries);
      expect(await readFile(filePath,"utf8")).toBe(raw);
    }finally{await verifier.close();}
  }finally{
    for(const w of workers)if(w.child.exitCode===null&&w.child.signalCode===null)w.child.kill("SIGKILL");
    await rm(dir,{recursive:true,force:true});
  }
}

describe("Hyper XSUS Core — recovery versus concurrent writes v3.6.0",()=>{
  for(const count of [10,25,50]){
    it("preserves a valid committed revision with "+count+" competing processes",
      async()=>{await scenario(count);},180000);
  }
});

import { describe, it, expect } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const atomicUrl = new URL("../../integration/atomic-json-writer.js", import.meta.url).href;
const journalUrl = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;
const writerCode = [
  'import { writeAtomicJson } from ' + JSON.stringify(atomicUrl) + ';',
  'import { rename } from "node:fs/promises";',
  'const [path, phase, id] = process.argv.slice(1);',
  'const entries = [{id:1,state:"completed",attempted:1,added:1},{id:Number(id),state:"running",attempted:2,added:1}];',
  'await writeAtomicJson(path,{version:"0.1.0",entries},{io:{rename:async(source,target)=>{',
  '  if(phase==="before"){process.stdout.write("CRASH_POINT\\n");await new Promise(()=>{});}',
  '  await rename(source,target);',
  '  if(phase==="after"){process.stdout.write("CRASH_POINT\\n");await new Promise(()=>{});}',
  '}}});',
].join("\n");
const recoverCode = [
  'import { createTransactionJournalStore } from ' + JSON.stringify(journalUrl) + ';',
  'const store=createTransactionJournalStore({filePath:process.argv[1],exclusiveLock:true});',
  'const entries=await store.recoverInterrupted();',
  'const snapshot=await store.loadWithRevision();',
  'await store.close();',
  'process.stdout.write(JSON.stringify({entries,snapshot}));',
].join("\n");

function waitForMarker(child) {
  return new Promise((resolve,reject)=>{
    let output="",stderr="",settled=false;
    const timer=setTimeout(()=>finish(new Error("Marker timeout: "+stderr)),15000);
    function finish(error){
      if(settled)return;settled=true;clearTimeout(timer);
      child.stdout.off("data",onData);child.stderr.off("data",onStderr);
      child.off("error",onError);child.off("close",onClose);
      if(error)reject(error);else resolve();
    }
    function onData(chunk){output+=chunk.toString();if(output.includes("CRASH_POINT\n"))finish();}
    function onStderr(chunk){stderr+=chunk.toString();}
    function onError(error){finish(error);}
    function onClose(code,signal){finish(new Error("Early exit "+code+"/"+signal+" "+stderr));}
    child.stdout.on("data",onData);child.stderr.on("data",onStderr);
    child.on("error",onError);child.on("close",onClose);
  });
}
async function killAndWait(child){
  const exited=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("SIGKILL timeout")),15000);
    child.once("close",(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
  });
  expect(child.kill("SIGKILL")).toBe(true);
  expect((await exited).signal).toBe("SIGKILL");
}
function recover(filePath){
  const result=spawnSync(process.execPath,["--input-type=module","-e",recoverCode,filePath],
    {encoding:"utf8",timeout:15000});
  expect(result.status,result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}
async function stress(rounds){
  const dir=await mkdtemp(join(tmpdir(),"xsus-recovery-stress-v34-"));
  const filePath=join(dir,"journal.json");
  let child;
  try{
    const store=createTransactionJournalStore({filePath,exclusiveLock:true});
    try{await store.save([{id:1,state:"completed",attempted:1,added:1}]);}
    finally{await store.close();}
    for(let i=0;i<rounds;i++){
      const phase=i%2===0?"before":"after";
      const id=i+2;
      const baseline=await readFile(filePath,"utf8");
      child=spawn(process.execPath,["--input-type=module","-e",writerCode,filePath,phase,String(id)],
        {stdio:["ignore","pipe","pipe"]});
      await waitForMarker(child);
      await killAndWait(child);
      child=undefined;
      const raw=await readFile(filePath,"utf8");
      const parsed=JSON.parse(raw);
      expect(parsed.version).toBe(TRANSACTION_JOURNAL_VERSION);
      expect(parsed.entries[0]).toEqual({id:1,state:"completed",attempted:1,added:1});
      if(phase==="before")expect(raw).toBe(baseline);
      else expect(parsed.entries[1]).toMatchObject({id,state:"running"});
      const first=recover(filePath);
      expect(first.entries[0]).toEqual({id:1,state:"completed",attempted:1,added:1});
      if(phase==="after")expect(first.entries[1]).toMatchObject({id,state:"interrupted"});
      const stable=await readFile(filePath,"utf8");
      expect(first.snapshot.revision).toBe(createHash("sha256").update(stable).digest("hex"));
      expect(recover(filePath)).toEqual(first);
      expect(await readFile(filePath,"utf8")).toBe(stable);
    }
  }finally{
    if(child&&child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
    await rm(dir,{recursive:true,force:true});
  }
}
describe("Hyper XSUS Core — crash recovery stress v3.4.0",()=>{
  for(const rounds of [10,25,50]){
    it.skipIf(process.platform==="win32")(
      "maintains committed journal across "+rounds+" alternating SIGKILL/restart cycles",
      async()=>{await stress(rounds);},300000);
  }
});

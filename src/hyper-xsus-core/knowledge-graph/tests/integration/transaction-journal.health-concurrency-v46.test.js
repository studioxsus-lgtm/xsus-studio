import { describe,it,expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp,rm,readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";
import { createPersistentJournalHealthHistory,PERSISTENT_HEALTH_HISTORY_VERSION } from "../../integration/transaction-journal-health-persistence.js";

const moduleUrl=new URL("../../integration/transaction-journal-health-persistence.js",import.meta.url).href;
const childCode=[
  'import { createPersistentJournalHealthHistory } from '+JSON.stringify(moduleUrl)+';',
  'const filePath=process.argv[1]; const timestamp=Number(process.argv[2]);',
  'const store=createPersistentJournalHealthHistory({filePath,maxEntries:100});',
  'try {await store.append({level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null},{timestamp});',
  'process.stdout.write(JSON.stringify({ok:true})+"\\n");}',
  'catch(error){process.stdout.write(JSON.stringify({ok:false,code:error.code??"UNEXPECTED"})+"\\n");}',
  'finally{await store.close();}',
].join("\n");
function childAppend(filePath,timestamp){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,["--input-type=module","-e",childCode,filePath,String(timestamp)],{stdio:["ignore","pipe","pipe"]});
    let stdout="",stderr="";
    child.stdout.on("data",chunk=>{stdout+=chunk.toString();});
    child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
    child.on("error",reject);
    child.on("close",code=>{
      if(code!==0)return reject(new Error("Child exited "+code+": "+stderr));
      try {resolve(JSON.parse(stdout.trim()));}catch(error){reject(new Error("Invalid child output: "+stdout+" "+stderr,{cause:error}));}
    });
  });
}
const report={level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null};
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-concurrency-v46-"));
  const filePath=join(dir,"health.json");
  try{await run(filePath);}finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — health history concurrency and recovery stress v4.6.0",()=>{
  it("rejects cross-process append while lock held without modifying committed history",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:100});
      try{
        await store.append(report,{timestamp:1});
        const before=await readFile(filePath,"utf8");
        await withExclusiveFileLock(filePath,async()=>{
          const result=await childAppend(filePath,2);
          expect(result).toEqual({ok:false,code:"XSUS_FILE_LOCK_BUSY"});
          expect(await readFile(filePath,"utf8")).toBe(before);
        });
        expect(await childAppend(filePath,3)).toEqual({ok:true});
        expect((await store.load()).map(x=>x.timestamp)).toEqual([1,3]);
      }finally{await store.close();}
    });
  },60000);
  it("persists 20 sequential cross-process appends and survives fresh-process reads",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:100});
      try{
        for(let timestamp=1;timestamp<=20;timestamp++)
          expect(await childAppend(filePath,timestamp)).toEqual({ok:true});
        const bytes=await readFile(filePath,"utf8");
        expect(JSON.parse(bytes).version).toBe(PERSISTENT_HEALTH_HISTORY_VERSION);
        expect((await store.load()).map(x=>x.timestamp)).toEqual(Array.from({length:20},(_,i)=>i+1));
        const digest=createHash("sha256").update(bytes).digest("hex");
        expect(createHash("sha256").update(await readFile(filePath,"utf8")).digest("hex")).toBe(digest);
      }finally{await store.close();}
    });
  },120000);
  it("serializes 100 same-instance appends without losing observations",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:100});
      try{
        await Promise.all(Array.from({length:100},(_,i)=>store.append(report,{timestamp:i+1})));
        expect((await store.load()).map(x=>x.timestamp)).toEqual(Array.from({length:100},(_,i)=>i+1));
        const reopened=createPersistentJournalHealthHistory({filePath,maxEntries:100});
        try{expect((await reopened.load()).map(x=>x.timestamp)).toEqual(Array.from({length:100},(_,i)=>i+1));}
        finally{await reopened.close();}
      }finally{await store.close();}
    });
  },120000);
});

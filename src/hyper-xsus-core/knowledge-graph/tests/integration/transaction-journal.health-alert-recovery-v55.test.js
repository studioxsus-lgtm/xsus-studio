import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,readdir,rename,open} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,basename} from "node:path";
import {createHash} from "node:crypto";
import {writeAtomicJson} from "../../integration/atomic-json-writer.js";
import {createPersistentAlertHistory,PERSISTENT_ALERT_HISTORY_VERSION} from "../../integration/transaction-journal-health-alert-persistence.js";
import {evaluateHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";

const evaluation=(i)=>evaluateHealthHistoryAlerts({
  status:i%2?"missing":"healthy",lockPresent:false,
  entryCount:i%2?null:1,latestLevel:i%2?null:"healthy",
});
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-recovery-v55-"));
 try{await run({dir,filePath:join(dir,"alerts.json")});}
 finally{await rm(dir,{recursive:true,force:true});}
}
const sha=raw=>createHash("sha256").update(raw).digest("hex");
async function seed(filePath){
 const store=createPersistentAlertHistory({filePath,maxEntries:10});
 try{await store.append(evaluation(1),{timestamp:1});}
 finally{await store.close();}
 return readFile(filePath,"utf8");
}
describe("Hyper XSUS Core — Persistent Alert History Recovery & Integrity v5.5.0",()=>{
 it("keeps committed bytes after an injected pre-rename failure",async()=>{
  await fixture(async({dir,filePath})=>{
   const before=await seed(filePath);
   const next={version:PERSISTENT_ALERT_HISTORY_VERSION,entries:[]};
   await expect(writeAtomicJson(filePath,next,{io:{
    rename:async()=>{throw Object.assign(new Error("injected pre-rename failure"),{code:"EIO"});}
   }})).rejects.toMatchObject({code:"EIO"});
   expect(await readFile(filePath,"utf8")).toBe(before);
   const fresh=createPersistentAlertHistory({filePath,maxEntries:10});
   expect((await fresh.load()).map(x=>x.timestamp)).toEqual([1]);
   await fresh.close();
   expect((await readdir(dir)).sort()).toEqual(["alerts.json"]);
  });
 });
 it("does not misreport pre-rename durability when directory fsync fails after rename",async()=>{
  await fixture(async({dir,filePath})=>{
   const before=await seed(filePath);
   const payload={version:PERSISTENT_ALERT_HISTORY_VERSION,entries:[]};
   await expect(writeAtomicJson(filePath,payload,{io:{
    open:async(path,flags,...args)=>{
     if(path===dir&&flags==="r")return {
      sync:async()=>{throw Object.assign(new Error("injected directory sync failure"),{code:"EIO"});},
      close:async()=>{},
     };
     return open(path,flags,...args);
    },
   }})).rejects.toMatchObject({code:"EIO"});
   const after=await readFile(filePath,"utf8");
   expect(after).not.toBe(before);
   expect(JSON.parse(after)).toEqual(payload);
   const fresh=createPersistentAlertHistory({filePath,maxEntries:10});
   expect(await fresh.load()).toEqual([]);
   await fresh.close();
  });
 });
 it("rejects corrupted committed observations and preserves exact bytes",async()=>{
  await fixture(async({filePath})=>{
   const before=await seed(filePath);
   const invalid=JSON.parse(before);
   invalid.entries[0].alerts[0].severity="unrecognized";
   const corrupted=JSON.stringify(invalid);
   await writeFile(filePath,corrupted,"utf8");
   const store=createPersistentAlertHistory({filePath,maxEntries:10});
   try{
    await expect(store.load()).rejects.toThrow();
    await expect(store.append(evaluation(2),{timestamp:2})).rejects.toThrow();
    expect(await readFile(filePath,"utf8")).toBe(corrupted);
   }finally{await store.close();}
  });
 });
 it("ignores an orphan temporary file and permits explicit recovery from a trusted committed copy",async()=>{
  await fixture(async({dir,filePath})=>{
   const before=await seed(filePath);
   const orphan=join(dir,`.${basename(filePath)}.orphan.tmp`);
   await writeFile(orphan,'{"version":"5.4.0","entries":[',"utf8");
   const store=createPersistentAlertHistory({filePath,maxEntries:10});
   try{
    expect((await store.load()).map(x=>x.timestamp)).toEqual([1]);
    await store.append(evaluation(2),{timestamp:2});
    expect((await store.load()).map(x=>x.timestamp)).toEqual([1,2]);
   }finally{await store.close();}
   expect(await readFile(orphan,"utf8")).toBe('{"version":"5.4.0","entries":[');
   const committed=await readFile(filePath,"utf8");
   expect(sha(committed)).not.toBe(sha(before));
   await writeFile(filePath,"{corrupt","utf8");
   const failed=createPersistentAlertHistory({filePath,maxEntries:10});
   await expect(failed.load()).rejects.toThrow();
   await failed.close();
   // Operator-directed trusted restore; the store never performs it automatically.
   await writeFile(filePath,committed,"utf8");
   const recovered=createPersistentAlertHistory({filePath,maxEntries:10});
   expect((await recovered.load()).map(x=>x.timestamp)).toEqual([1,2]);
   await recovered.close();
  });
 });
});

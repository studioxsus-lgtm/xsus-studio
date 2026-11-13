import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createPersistentAlertHistory,PERSISTENT_ALERT_HISTORY_VERSION} from "../../integration/transaction-journal-health-alert-persistence.js";

const evaluation=i=>i%3===0
 ? {status:"healthy",alerts:[]}
 : i%3===1
 ? {status:"attention",alerts:[{code:"XSUS_ALERT_WARNING",severity:"warning",consecutive:i,repeated:i>1}]}
 : {status:"critical",alerts:[{code:"XSUS_ALERT_CRITICAL",severity:"critical",consecutive:i,repeated:i>2}]};
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-alert-integrity-v59-"));
 try{await fn(join(dir,"alerts.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
describe("Hyper XSUS Core — persistent alert history integrity stress v5.9.0",()=>{
 it("preserves the exact final bounded sequence across 1000 serialized appends and fresh reads",async()=>{
  await fixture(async(filePath)=>{
   const maxEntries=40;
   const store=createPersistentAlertHistory({filePath,maxEntries});
   try{
    for(let i=1;i<=1000;i++){
     const appended=await store.append(evaluation(i),{timestamp:i});
     expect(appended.timestamp).toBe(i);
     if(i%100===0){
      const fresh=createPersistentAlertHistory({filePath,maxEntries});
      try{
       const entries=await fresh.load();
       expect(entries.length).toBe(Math.min(i,maxEntries));
       expect(entries.map(x=>x.timestamp)).toEqual(
        Array.from({length:Math.min(i,maxEntries)},(_,j)=>i-Math.min(i,maxEntries)+j+1)
       );
       expect(entries.every(x=>x.alertCount===x.alerts.length)).toBe(true);
      }finally{await fresh.close();}
     }
    }
   }finally{await store.close();}
   const bytes=await readFile(filePath,"utf8");
   const parsed=JSON.parse(bytes);
   expect(parsed.version).toBe(PERSISTENT_ALERT_HISTORY_VERSION);
   expect(parsed.entries.map(x=>x.timestamp)).toEqual(Array.from({length:40},(_,i)=>961+i));
   const hash=digest(bytes);
   const fresh=createPersistentAlertHistory({filePath,maxEntries});
   try{expect((await fresh.load()).map(x=>x.timestamp)).toEqual(parsed.entries.map(x=>x.timestamp));}
   finally{await fresh.close();}
   expect(digest(await readFile(filePath,"utf8"))).toBe(hash);
  });
 },180000);
 it("rejects duplicate alert codes in committed observations without changing bytes",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:10});
   await store.append(evaluation(1),{timestamp:1});
   await store.close();
   const parsed=JSON.parse(await readFile(filePath,"utf8"));
   parsed.entries[0].alerts.push({...parsed.entries[0].alerts[0]});
   parsed.entries[0].alertCount=2;
   const corrupt=JSON.stringify(parsed);
   await writeFile(filePath,corrupt,"utf8");
   const reopened=createPersistentAlertHistory({filePath,maxEntries:10});
   try{
    await expect(reopened.load()).rejects.toThrow();
    await expect(reopened.append(evaluation(2),{timestamp:2})).rejects.toThrow();
    expect(await readFile(filePath,"utf8")).toBe(corrupt);
   }finally{await reopened.close();}
  });
 });
 it("rejects malformed persisted status and impossible alert counts without implicit repair",async()=>{
  await fixture(async(filePath)=>{
   const store=createPersistentAlertHistory({filePath,maxEntries:10});
   await store.append(evaluation(2),{timestamp:2});
   await store.close();
   const valid=JSON.parse(await readFile(filePath,"utf8"));
   for(const change of [
    item=>{item.status="healthy";},
    item=>{item.alertCount=999;},
    item=>{item.timestamp=-1;},
   ]){
    const corrupted=structuredClone(valid);
    change(corrupted.entries[0]);
    const bytes=JSON.stringify(corrupted);
    await writeFile(filePath,bytes,"utf8");
    const reopened=createPersistentAlertHistory({filePath,maxEntries:10});
    try{
     await expect(reopened.load()).rejects.toThrow();
     await expect(reopened.append(evaluation(3),{timestamp:3})).rejects.toThrow();
     expect(await readFile(filePath,"utf8")).toBe(bytes);
    }finally{await reopened.close();}
   }
  });
 });
});

import { describe,it,expect } from "vitest";
import { mkdtemp,rm,readFile,readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createPersistentJournalHealthHistory,PERSISTENT_HEALTH_HISTORY_VERSION } from "../../integration/transaction-journal-health-persistence.js";

const report=(i)=>({
  level:i%7===0?"attention":"healthy",
  journalStatus:"healthy",
  revision:null,
  warnings:i%7===0?["STRESS_WARNING"]:[],
  transactionCounts:{running:0,completed:i,failed:0,interrupted:0},
});
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-integrity-v49-"));
  try{await run({dir,filePath:join(dir,"history.json")});}
  finally{await rm(dir,{recursive:true,force:true});}
}
function digest(raw){return createHash("sha256").update(raw).digest("hex");}
async function verify(filePath,expected,maxEntries){
  const raw=await readFile(filePath,"utf8");
  const parsed=JSON.parse(raw);
  expect(parsed.version).toBe(PERSISTENT_HEALTH_HISTORY_VERSION);
  expect(parsed.entries.length).toBeLessThanOrEqual(maxEntries);
  expect(parsed.entries.map(item=>item.timestamp)).toEqual(expected);
  const fresh=createPersistentJournalHealthHistory({filePath,maxEntries});
  try{
    const loaded=await fresh.load();
    expect(loaded.map(item=>item.timestamp)).toEqual(expected);
    expect(loaded.map(item=>item.transactionCounts.completed)).toEqual(expected);
  }finally{await fresh.close();}
  expect(digest(await readFile(filePath,"utf8"))).toBe(digest(raw));
}
describe("Hyper XSUS Core — health history integrity stress v4.9.0",()=>{
  it("retains exact final 40 observations after 200 atomic append operations",async()=>{
    await fixture(async({dir,filePath})=>{
      const maxEntries=40;
      const store=createPersistentJournalHealthHistory({filePath,maxEntries});
      try{
        for(let i=1;i<=200;i++){
          await store.append(report(i),{timestamp:i});
          if(i%25===0){
            const expected=Array.from({length:Math.min(i,maxEntries)},(_,j)=>i-Math.min(i,maxEntries)+j+1);
            await verify(filePath,expected,maxEntries);
          }
        }
      }finally{await store.close();}
      expect((await readdir(dir)).sort()).toEqual(["history.json"]);
    });
  },180000);
  it("serializes 120 queued appends with bounded retention and stable SHA-256 across reloads",async()=>{
    await fixture(async({filePath})=>{
      const maxEntries=30;
      const store=createPersistentJournalHealthHistory({filePath,maxEntries});
      try{
        await Promise.all(Array.from({length:120},(_,i)=>store.append(report(i+1),{timestamp:i+1})));
      }finally{await store.close();}
      const expected=Array.from({length:maxEntries},(_,i)=>91+i);
      await verify(filePath,expected,maxEntries);
      const raw=await readFile(filePath,"utf8");
      for(let i=0;i<10;i++){
        await verify(filePath,expected,maxEntries);
        expect(await readFile(filePath,"utf8")).toBe(raw);
      }
    });
  },180000);
  it("rejects corrupt committed snapshots without silently overwriting bytes",async()=>{
    await fixture(async({filePath})=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:10});
      try{
        await store.append(report(1),{timestamp:1});
        const original=await readFile(filePath,"utf8");
        const corrupted=JSON.stringify({...JSON.parse(original),entries:[{timestamp:2,level:"INVALID",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null}]});
        const {writeFile}=await import("node:fs/promises");
        await writeFile(filePath,corrupted,"utf8");
        await expect(store.load()).rejects.toThrow();
        await expect(store.append(report(3),{timestamp:3})).rejects.toThrow();
        expect(await readFile(filePath,"utf8")).toBe(corrupted);
      }finally{await store.close();}
    });
  });
});

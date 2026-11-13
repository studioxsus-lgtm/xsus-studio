import { describe,it,expect } from "vitest";
import { mkdtemp,rm,readdir,readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { createTransactionJournalHealthHistory } from "../../integration/transaction-journal-health-history.js";

const report=(level,warnings=[],counts=null)=>({level,journalStatus:level==="critical"?"invalid":"healthy",warnings,transactionCounts:counts,revision:null});
describe("Hyper XSUS Core — health history and trends v4.3.0",()=>{
  it("rejects invalid capacity and observations",()=>{
    expect(()=>createTransactionJournalHealthHistory({maxEntries:0})).toThrow(RangeError);
    expect(()=>createTransactionJournalHealthHistory({maxEntries:10001})).toThrow(RangeError);
    const history=createTransactionJournalHealthHistory();
    expect(()=>history.record({level:"wrong",warnings:[]})).toThrow(TypeError);
    expect(()=>history.record(report("healthy"),{timestamp:-1})).toThrow(TypeError);
    expect(history.analyze()).toMatchObject({sampleCount:0,direction:"insufficient-data"});
  });
  it("detects worsening, improving, and stable transitions",()=>{
    const history=createTransactionJournalHealthHistory();
    history.record(report("healthy"),{timestamp:1});
    expect(history.analyze().direction).toBe("insufficient-data");
    history.record(report("attention"),{timestamp:2});
    expect(history.analyze().direction).toBe("worsening");
    history.record(report("critical"),{timestamp:3});
    expect(history.analyze().direction).toBe("worsening");
    history.record(report("healthy"),{timestamp:4});
    expect(history.analyze().direction).toBe("improving");
    history.record(report("healthy"),{timestamp:5});
    expect(history.analyze()).toMatchObject({sampleCount:5,direction:"stable",firstTimestamp:1,latestTimestamp:5});
  });
  it("retains only bounded copies and counts repeated warnings per observation",()=>{
    const history=createTransactionJournalHealthHistory({maxEntries:3});
    const input=report("attention",["LOCK_PRESENT_UNVERIFIED","LOCK_PRESENT_UNVERIFIED"]);
    history.record(input,{timestamp:1});
    input.warnings.push("MUTATED");
    history.record(report("attention",["LOCK_PRESENT_UNVERIFIED"]),{timestamp:2});
    history.record(report("attention",["TEMPORARY_FILES_PRESENT"]),{timestamp:3});
    history.record(report("healthy"),{timestamp:4});
    expect(history.list().map(x=>x.timestamp)).toEqual([2,3,4]);
    expect(history.analyze().repeatedWarnings).toEqual([]);
    history.record(report("attention",["TEMPORARY_FILES_PRESENT"]),{timestamp:5});
    expect(history.analyze().repeatedWarnings).toEqual([{code:"TEMPORARY_FILES_PRESENT",occurrences:2}]);
    expect(Object.isFrozen(history.list()[0])).toBe(true);
    expect(Object.isFrozen(history.list()[0].warnings)).toBe(true);
  });
  it("samples a real journal without modifying its bytes or creating auxiliary files",async()=>{
    const dir=await mkdtemp(join(tmpdir(),"xsus-health-history-v43-"));
    const filePath=join(dir,"journal.json");
    const store=createTransactionJournalStore({filePath,exclusiveLock:true});
    try {
      await store.save([{id:1,state:"running",attempted:1,added:0}]);
      const bytes=await readFile(filePath,"utf8");
      const files=await readdir(dir);
      const history=createTransactionJournalHealthHistory();
      const observed=await history.sample(filePath,{timestamp:100});
      expect(observed).toMatchObject({timestamp:100,level:"attention",warnings:["RUNNING_TRANSACTIONS_PRESENT"]});
      expect(history.analyze()).toMatchObject({sampleCount:1,persistence:"memory-only"});
      expect(await readFile(filePath,"utf8")).toBe(bytes);
      expect(await readdir(dir)).toEqual(files);
    } finally {await store.close();await rm(dir,{recursive:true,force:true});}
  });
});

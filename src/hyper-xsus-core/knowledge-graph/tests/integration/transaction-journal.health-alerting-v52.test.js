import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {evaluateHealthHistoryAlerts,inspectHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";
import {createPersistentJournalHealthHistory} from "../../integration/transaction-journal-health-persistence.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";
const diagnostic=(overrides={})=>({status:"healthy",entryCount:1,latestLevel:"healthy",lockPresent:false,...overrides});
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),"xsus-health-alert-v52-"));try{await run(join(dir,"health.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper XSUS Core — Health History Alerting v5.2.0",()=>{
 it("classifies missing, corrupt and locked diagnostics without mutations",()=>{
  const input=Object.freeze(diagnostic({status:"invalid",lockPresent:true}));
  const result=evaluateHealthHistoryAlerts(input);
  expect(result.status).toBe("critical");
  expect(result.alerts.map(x=>x.code)).toEqual(["HISTORY_INVALID","HISTORY_LOCK_PRESENT"]);
  expect(result).toMatchObject({readOnly:true,notificationsSent:false,cleanupPerformed:false});
  expect(Object.isFrozen(result.alerts)).toBe(true);
  expect(evaluateHealthHistoryAlerts(diagnostic({status:"missing"})).alerts[0].code).toBe("HISTORY_MISSING");
 });
 it("detects consecutive repeated anomalies and resets after a clean observation",()=>{
  const bad=diagnostic({latestLevel:"attention"});
  const result=evaluateHealthHistoryAlerts(bad,{previousDiagnostics:[bad,diagnostic(),bad,bad],repeatThreshold:3});
  expect(result.alerts[0]).toMatchObject({code:"LATEST_HEALTH_ATTENTION",consecutive:3,repeated:true});
  const reset=evaluateHealthHistoryAlerts(bad,{previousDiagnostics:[bad,bad,diagnostic()]});
  expect(reset.alerts[0]).toMatchObject({consecutive:1,repeated:false});
  expect(evaluateHealthHistoryAlerts(diagnostic()).alerts).toEqual([]);
 });
 it("rejects malformed diagnostics and thresholds",()=>{
  expect(()=>evaluateHealthHistoryAlerts(null)).toThrow(TypeError);
  expect(()=>evaluateHealthHistoryAlerts(diagnostic(),{repeatThreshold:1})).toThrow(TypeError);
  expect(()=>evaluateHealthHistoryAlerts(diagnostic(),{previousDiagnostics:[null]})).toThrow(TypeError);
 });
 it("inspects missing, valid and invalid committed history without writing",async()=>{
  await fixture(async(filePath)=>{
   const missing=await inspectHealthHistoryAlerts(filePath);
   expect(missing.evaluation.alerts[0].code).toBe("HISTORY_MISSING");
   await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
   const store=createPersistentJournalHealthHistory({filePath});
   await store.append({level:"critical",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null},{timestamp:42});
   await store.close();
   const before=await readFile(filePath,"utf8");
   const valid=await inspectHealthHistoryAlerts(filePath);
   expect(valid.evaluation.alerts[0].code).toBe("LATEST_HEALTH_CRITICAL");
   expect(await readFile(filePath,"utf8")).toBe(before);
   await withExclusiveFileLock(filePath,async()=>{
    const locked=await inspectHealthHistoryAlerts(filePath);
    expect(locked.evaluation.alerts.some(a=>a.code==="HISTORY_LOCK_PRESENT")).toBe(true);
   });
   await writeFile(filePath,"{bad json","utf8");
   const invalid=await inspectHealthHistoryAlerts(filePath);
   expect(invalid.evaluation.alerts[0].code).toBe("HISTORY_INVALID");
   expect(await readFile(filePath,"utf8")).toBe("{bad json");
  });
 });
});

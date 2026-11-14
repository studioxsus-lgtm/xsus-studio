import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentAlertHistory} from "../../integration/transaction-journal-health-alert-persistence.js";
import {evaluateAlertHistoryAnomalies,inspectAlertHistoryAnomalies} from "../../integration/transaction-journal-health-alert-monitoring.js";
import {withExclusiveFileLock} from "../../integration/exclusive-file-lock.js";

const diagnostic=(overrides={})=>({
 status:"healthy",lockPresent:false,readOnly:true,entryCount:2,
 latestTimestamp:20,latestStatus:"healthy",...overrides
});
const codes=result=>result.anomalies.map(a=>a.code);
describe("Hyper XSUS Core — alert history monitoring v6.2.0",()=>{
 it("reports healthy unchanged diagnostics without side effects",()=>{
  const result=evaluateAlertHistoryAnomalies(diagnostic(),{previousDiagnostics:[diagnostic()]});
  expect(result).toMatchObject({status:"healthy",anomalyCount:0,readOnly:true,advisory:true,notificationsSent:false,cleanupPerformed:false});
  expect(Object.isFrozen(result.anomalies)).toBe(true);
 });
 it("detects degraded and repeatedly invalid diagnostics",()=>{
  const invalid=diagnostic({status:"invalid",entryCount:null,latestStatus:null});
  const result=evaluateAlertHistoryAnomalies(invalid,{previousDiagnostics:[diagnostic(),invalid,invalid],repeatThreshold:3});
  expect(codes(result)).toEqual(["HISTORY_INVALID"]);
  expect(result.anomalies[0]).toMatchObject({severity:"critical",consecutive:3,repeated:true});
  expect(result.status).toBe("critical");
  expect(codes(evaluateAlertHistoryAnomalies(invalid,{previousDiagnostics:[diagnostic()]}))).toContain("STATUS_DEGRADED");
 });
 it("detects persistent lock, count drop, timestamp regression and worsening status",()=>{
  const previous=diagnostic({lockPresent:true,entryCount:8,latestTimestamp:90,latestStatus:"attention"});
  const current=diagnostic({lockPresent:true,entryCount:3,latestTimestamp:80,latestStatus:"critical"});
  const result=evaluateAlertHistoryAnomalies(current,{previousDiagnostics:[previous,previous],repeatThreshold:3});
  expect(codes(result)).toEqual(["LOCK_PRESENT","ENTRY_COUNT_DECREASED","LATEST_TIMESTAMP_REGRESSED","LATEST_ALERT_WORSENED"]);
  expect(result.anomalies[0]).toMatchObject({consecutive:3,repeated:true});
  expect(result.status).toBe("critical");
 });
 it("rejects invalid input and repeat thresholds",()=>{
  expect(()=>evaluateAlertHistoryAnomalies({status:"healthy"})).toThrow(TypeError);
  expect(()=>evaluateAlertHistoryAnomalies(diagnostic(),{repeatThreshold:1})).toThrow(TypeError);
  expect(()=>evaluateAlertHistoryAnomalies(diagnostic(),{previousDiagnostics:[{}]})).toThrow(TypeError);
 });
 it("inspects real persisted history and held lock without writing",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"xsus-alert-monitor-v62-"));
  const filePath=join(dir,"alerts.json");
  try{
   const store=createPersistentAlertHistory({filePath});
   await store.append({status:"healthy",alerts:[]},{timestamp:10});
   await store.close();
   const before=await readFile(filePath,"utf8");
   await withExclusiveFileLock(filePath,async()=>{
    const result=await inspectAlertHistoryAnomalies(filePath);
    expect(result.diagnostic).toMatchObject({status:"healthy",lockPresent:true,entryCount:1});
    expect(codes(result.evaluation)).toContain("LOCK_PRESENT");
    expect(await readFile(filePath,"utf8")).toBe(before);
   });
  }finally{await rm(dir,{recursive:true,force:true});}
 });
});

import {describe,it,expect} from "vitest";
import {createAnomalyHistory,ANOMALY_HISTORY_VERSION} from "../../integration/transaction-journal-health-anomaly-history.js";
import {evaluateAlertHistoryAnomalies} from "../../integration/transaction-journal-health-alert-monitoring.js";

const warning=code=>({code,severity:"warning",consecutive:1,repeated:false});
const critical=code=>({code,severity:"critical",consecutive:2,repeated:true});
const evaluation=(status,anomalies=[])=>({status,anomalies,anomalyCount:anomalies.length});
describe("Hyper XSUS Core — anomaly history and trends v6.3.0",()=>{
 it("starts empty and reports insufficient trend data",()=>{
  const history=createAnomalyHistory();
  expect(history.list()).toEqual([]);
  expect(history.analyze()).toMatchObject({version:ANOMALY_HISTORY_VERSION,sampleCount:0,
   direction:"insufficient-data",latestStatus:null,repeatedAnomalies:[],
   persistence:"memory-only",readOnly:true,notificationsSent:false,cleanupPerformed:false});
 });
 it("detects worsening, improving and stable trends across observations",()=>{
  const history=createAnomalyHistory();
  history.record(evaluation("healthy"),{timestamp:1});
  history.record(evaluation("attention",[warning("LOCK_PRESENT")]),{timestamp:2});
  expect(history.analyze().direction).toBe("worsening");
  history.record(evaluation("critical",[critical("HISTORY_INVALID")]),{timestamp:3});
  expect(history.analyze().direction).toBe("worsening");
  history.record(evaluation("attention",[warning("LOCK_PRESENT")]),{timestamp:4});
  expect(history.analyze().direction).toBe("improving");
  history.record(evaluation("attention",[warning("LOCK_PRESENT")]),{timestamp:5});
  expect(history.analyze()).toMatchObject({direction:"stable",sampleCount:5,
   firstTimestamp:1,latestTimestamp:5,
   repeatedAnomalies:[{code:"LOCK_PRESENT",occurrences:3}]});
 });
 it("enforces capacity and calculates frequencies from retained observations only",()=>{
  const history=createAnomalyHistory({maxEntries:3});
  for(let i=1;i<=10;i++)history.record(evaluation("attention",[warning(i<=7?"OLD":"NEW")]),{timestamp:i});
  expect(history.list().map(x=>x.timestamp)).toEqual([8,9,10]);
  expect(history.analyze().repeatedAnomalies).toEqual([{code:"NEW",occurrences:3}]);
 });
 it("defensively snapshots nested anomaly details and freezes returned records",()=>{
  const history=createAnomalyHistory();
  const anomaly={...warning("COUNT_DROP"),details:{samples:[1,2]}};
  const input=evaluation("attention",[anomaly]);
  const entry=history.record(input,{timestamp:9});
  anomaly.details.samples.push(3);
  input.anomalies.push(warning("OTHER"));
  expect(entry.anomalies[0].details.samples).toEqual([1,2]);
  expect(Object.isFrozen(entry.anomalies[0].details.samples)).toBe(true);
  expect(Object.isFrozen(history.list())).toBe(true);
  expect(Object.isFrozen(history.analyze())).toBe(true);
 });
 it("rejects invalid status, duplicate codes and inconsistent severity without mutation",()=>{
  const history=createAnomalyHistory();
  for(const invalid of [
   evaluation("healthy",[warning("A")]),
   evaluation("critical",[warning("A")]),
   evaluation("attention",[critical("A")]),
   evaluation("attention",[warning("A"),warning("A")]),
   {...evaluation("attention",[warning("A")]),anomalyCount:2},
  ])expect(()=>history.record(invalid,{timestamp:1})).toThrow(TypeError);
  expect(()=>history.record(evaluation("healthy"),{timestamp:-1})).toThrow(TypeError);
  expect(()=>createAnomalyHistory({maxEntries:0})).toThrow(RangeError);
  expect(history.list()).toEqual([]);
 });
 it("accepts actual v6.2 monitor evaluation without changing the diagnostic",()=>{
  const diagnostic={status:"healthy",lockPresent:true,readOnly:true,entryCount:2,
   latestTimestamp:20,latestStatus:"healthy"};
  const result=evaluateAlertHistoryAnomalies(diagnostic);
  const history=createAnomalyHistory();
  history.record(result,{timestamp:100});
  expect(history.list()[0]).toMatchObject({status:"attention",anomalyCount:1});
  expect(diagnostic.lockPresent).toBe(true);
 });
});

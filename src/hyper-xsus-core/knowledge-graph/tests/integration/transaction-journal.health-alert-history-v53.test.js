import {describe,it,expect} from "vitest";
import {createHealthAlertHistory} from "../../integration/transaction-journal-health-alert-history.js";
import {evaluateHealthHistoryAlerts} from "../../integration/transaction-journal-health-alerting.js";
const diagnostic=(overrides={})=>({status:"healthy",entryCount:1,latestLevel:"healthy",lockPresent:false,...overrides});
describe("Hyper XSUS Core — Alert History & Trend Analysis v5.3.0",()=>{
 it("tracks worsening, improving and stable severity changes",()=>{
  const history=createHealthAlertHistory();
  history.record(evaluateHealthHistoryAlerts(diagnostic()),{timestamp:1});
  expect(history.analyze().direction).toBe("insufficient-data");
  history.record(evaluateHealthHistoryAlerts(diagnostic({status:"missing"})),{timestamp:2});
  expect(history.analyze().direction).toBe("worsening");
  history.record(evaluateHealthHistoryAlerts(diagnostic({status:"invalid"})),{timestamp:3});
  expect(history.analyze().direction).toBe("worsening");
  history.record(evaluateHealthHistoryAlerts(diagnostic({status:"invalid"})),{timestamp:4});
  expect(history.analyze().direction).toBe("stable");
  history.record(evaluateHealthHistoryAlerts(diagnostic()),{timestamp:5});
  expect(history.analyze()).toMatchObject({direction:"improving",latestStatus:"healthy",sampleCount:5});
 });
 it("retains only bounded observations and counts repeated alert codes",()=>{
  const history=createHealthAlertHistory({maxEntries:3});
  for(let i=1;i<=5;i++)
   history.record(evaluateHealthHistoryAlerts(diagnostic({status:"missing"})),{timestamp:i});
  expect(history.list().map(x=>x.timestamp)).toEqual([3,4,5]);
  expect(history.analyze().repeatedAlerts).toEqual([{code:"HISTORY_MISSING",occurrences:3}]);
  expect(history.analyze().persistence).toBe("memory-only");
 });
 it("copies and freezes nested alerts independently of input mutations",()=>{
  const history=createHealthAlertHistory();
  const alert={code:"CUSTOM",severity:"warning",consecutive:1,repeated:false};
  const evaluation={status:"attention",alerts:[alert]};
  const entry=history.record(evaluation,{timestamp:10});
  alert.code="MUTATED";evaluation.alerts.push({code:"OTHER"});
  expect(entry.alerts[0].code).toBe("CUSTOM");
  expect(entry.alerts).toHaveLength(1);
  expect(Object.isFrozen(entry)).toBe(true);
  expect(Object.isFrozen(entry.alerts)).toBe(true);
  expect(Object.isFrozen(entry.alerts[0])).toBe(true);
 });
 it("rejects malformed capacity, timestamps and inconsistent alert statuses",()=>{
  expect(()=>createHealthAlertHistory({maxEntries:0})).toThrow(RangeError);
  const history=createHealthAlertHistory();
  expect(()=>history.record(null)).toThrow(TypeError);
  expect(()=>history.record({status:"healthy",alerts:[]},{timestamp:-1})).toThrow(TypeError);
  expect(()=>history.record({status:"healthy",alerts:[{code:"X",severity:"warning",consecutive:1,repeated:false}]})).toThrow(TypeError);
  expect(()=>history.record({status:"critical",alerts:[]})).toThrow(TypeError);
  expect(history.list()).toEqual([]);
 });
});

import {describe,it,expect} from "vitest";
import {createReliabilityReport,compareReliabilityReports,summarizeReliabilityReports,RELIABILITY_REPORT_VERSION} from "../../integration/transaction-journal-reliability-reporting.js";
const sample=(overrides={})=>({testId:"xsus-v67-sigkill",mode:"post-commit-SIGKILL",
 operations:100,passed:100,failed:0,elapsedMs:1000,integrityVerified:true,
 powerLossVerified:false,revision:null,errors:[],...overrides});
describe("Hyper XSUS Core — reliability diagnostics and stress reporting v6.8.0",()=>{
 it("creates a validated immutable success report without claiming power-loss verification",()=>{
  const report=createReliabilityReport(sample());
  expect(report).toMatchObject({version:RELIABILITY_REPORT_VERSION,status:"passed",
   operations:100,passed:100,failed:0,integrityVerified:true,powerLossVerified:false,
   readOnly:true,advisory:true});
  expect(Object.isFrozen(report.errors)).toBe(true);
  expect(Object.isFrozen(report)).toBe(true);
 });
 it("records actual failures and preserves detached immutable error snapshots",()=>{
  const errors=[{code:"XSUS_FILE_LOCK_BUSY",count:2}];
  const report=createReliabilityReport(sample({passed:98,failed:2,errors}));
  errors[0].count=99;
  expect(report).toMatchObject({status:"failed",failed:2});
  expect(report.errors).toEqual([{code:"XSUS_FILE_LOCK_BUSY",count:2}]);
  expect(Object.isFrozen(report.errors[0])).toBe(true);
 });
 it("rejects inconsistent counters and fabricated error totals",()=>{
  for(const measurement of [
   sample({passed:101}),sample({passed:99,failed:0}),
   sample({passed:99,failed:1,errors:[{code:"EIO",count:2}]}),
   sample({passed:98,failed:2,errors:[{code:"EIO",count:1},{code:"EIO",count:1}]}),
   sample({elapsedMs:-1}),sample({integrityVerified:"yes"}),
   sample({revision:"invalid"}),sample({mode:"unknown"}),
  ])expect(()=>createReliabilityReport(measurement)).toThrow(TypeError);
 });
 it("detects increased failures, integrity loss and status regression",()=>{
  const compared=compareReliabilityReports(sample(),sample({
   passed:99,failed:1,integrityVerified:false,errors:[{code:"EIO",count:1}]
  }));
  expect(compared.regression).toBe(true);
  expect(compared.reasons).toEqual(["FAILURES_INCREASED","INTEGRITY_REGRESSED","STATUS_REGRESSED"]);
 });
 it("detects slowdown above a configurable threshold without false positives",()=>{
  expect(compareReliabilityReports(sample(),sample({elapsedMs:1600})).reasons)
   .toEqual(["DURATION_REGRESSED"]);
  expect(compareReliabilityReports(sample(),sample({elapsedMs:1500})).regression).toBe(false);
  expect(compareReliabilityReports(sample(),sample({elapsedMs:1600}),{maxSlowdownRatio:2}).regression).toBe(false);
  expect(()=>compareReliabilityReports(sample(),sample(),{maxSlowdownRatio:0.9})).toThrow(RangeError);
 });
 it("refuses comparisons between different test scenarios",()=>{
  expect(()=>compareReliabilityReports(sample(),sample({operations:200,passed:200}))).toThrow(TypeError);
  expect(()=>compareReliabilityReports(sample(),sample({testId:"other"}))).toThrow(TypeError);
 });
 it("aggregates successful and failed measurements with integrity status",()=>{
  const result=summarizeReliabilityReports([
   sample(),sample({testId:"concurrency",mode:"concurrent-appends",operations:200,
    passed:199,failed:1,elapsedMs:500,integrityVerified:false,
    errors:[{code:"EIO",count:1}]})
  ]);
  expect(result).toMatchObject({reportCount:2,operations:300,passed:299,failed:1,
   elapsedMs:1500,allIntegrityVerified:false,status:"failed"});
  expect(Object.isFrozen(result)).toBe(true);
 });
 it("handles empty reports and rejects invalid report collections",()=>{
  expect(summarizeReliabilityReports([])).toMatchObject({reportCount:0,operations:0,status:"passed"});
  expect(()=>summarizeReliabilityReports(null)).toThrow(TypeError);
 });
});

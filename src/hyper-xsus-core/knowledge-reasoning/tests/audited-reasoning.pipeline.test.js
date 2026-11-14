import {describe,it,expect,vi} from "vitest";
import {createAuditedReasoningPipeline,AUDITED_REASONING_VERSION}
 from "../audited-reasoning.pipeline.js";
const result={version:"0.6.0",status:"reviewed",evidenceCount:0,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
describe("Hyper Audited Reasoning Facade v0.7.0",()=>{
 it("returns decision result and verified receipt",async()=>{
  const x=createAuditedReasoningPipeline({pipeline:{run:async()=>result}});
  const r=await x.run({query:"test"});
  expect(x.version).toBe(AUDITED_REASONING_VERSION);
  expect(r.result).toEqual(result);
  expect(r.receipt.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(x.verifyAudit()).toBe(true);
 });
 it("does not record failed pipeline requests",async()=>{
  const x=createAuditedReasoningPipeline({pipeline:{
   run:async()=>{throw new Error("denied");}}});
  await expect(x.run({})).rejects.toThrow("denied");
  expect(x.auditSnapshot().entries).toHaveLength(0);
 });
 it("does not return invalid unaudited decisions",async()=>{
  const x=createAuditedReasoningPipeline({pipeline:{run:async()=>({})}});
  await expect(x.run({})).rejects.toThrow(TypeError);
  expect(x.auditSnapshot().entries).toHaveLength(0);
 });
 it("preserves bounded audit chain over 500 operations",async()=>{
  const x=createAuditedReasoningPipeline({pipeline:{run:async()=>result},
   maxEntries:32});
  for(let i=0;i<500;i++)await x.run({query:String(i)});
  expect(x.auditSnapshot().entries).toHaveLength(32);
  expect(x.verifyAudit()).toBe(true);
 });
 it("returns immutable receipt wrapper",async()=>{
  const x=createAuditedReasoningPipeline({pipeline:{run:async()=>result}});
  expect(Object.isFrozen(await x.run({}))).toBe(true);
 });
 it("rejects missing pipeline",()=>{
  expect(()=>createAuditedReasoningPipeline()).toThrow(TypeError);
 });
 it("stops recording after close",async()=>{
  const run=vi.fn(async()=>result);
  const x=createAuditedReasoningPipeline({pipeline:{run}});
  x.close();
  await expect(x.run({})).rejects.toThrow(/closed/);
  expect(run).not.toHaveBeenCalled();
 });
});

import {describe,it,expect,vi} from "vitest";
import {createKnowledgeContextEngine} from "../../knowledge-context/knowledge-context.engine.js";
import {createSecureGraphEvidenceProvider} from "../../knowledge-context/secure-graph-evidence.provider.js";
import {createSecureReasoningPipeline,KNOWLEDGE_REASONING_PIPELINE_VERSION}
 from "../secure-reasoning.pipeline.js";
const auth={principalId:"alice",scope:"team-a"};
const nodes=[
 {id:"e1",label:"Alpha one",metadata:{accessScope:"team-a"}},
 {id:"e2",label:"Alpha two",metadata:{accessScope:"team-a"}},
 {id:"e3",label:"Alpha private",metadata:{accessScope:"team-b"}}
];
const c=(id,s,o,polarity="positive",evidenceIds=["e"+id.slice(1)])=>({
 id,subject:s,predicate:"ancestor_of",object:o,polarity,evidenceIds});
function setup({authorize=async()=>true,resolveClaims=async()=>[
 c("c1","A","B"),c("c2","B","C")],maxPaths=1000}={}){
 let reads=0;
 const provider=createSecureGraphEvidenceProvider({
  graph:{getGraph(){reads++;return {nodes};}},authorize});
 const contextEngine=createKnowledgeContextEngine({provider});
 const pipeline=createSecureReasoningPipeline({
  contextEngine,resolveClaims,transitivePredicates:["ancestor_of"],maxPaths});
 return {pipeline,reads:()=>reads};
}
const request={query:"Alpha",authorization:auth};
describe("Hyper Secure Reasoning Pipeline v0.6.0",()=>{
 it("runs end-to-end with authorized evidence",async()=>{
  const result=await setup().pipeline.run(request);
  expect(result.version).toBe(KNOWLEDGE_REASONING_PIPELINE_VERSION);
  expect(result.status).toBe("reviewed");
  expect(result.summary).toEqual({eligible:1,needsReview:0,blocked:0});
  expect(result.decisions[0].evidenceIds).toEqual(["e1","e2"]);
 });
 it("never reads graph when policy denies access",async()=>{
  const x=setup({authorize:async()=>false});
  await expect(x.pipeline.run(request)).rejects.toMatchObject({
   code:"XSUS_EVIDENCE_ACCESS_DENIED"});
  expect(x.reads()).toBe(0);
 });
 it("rejects missing principal before context build",async()=>{
  const x=setup();
  await expect(x.pipeline.run({query:"Alpha",authorization:{scope:"team-a"}}))
   .rejects.toMatchObject({code:"XSUS_EVIDENCE_ACCESS_DENIED"});
  expect(x.reads()).toBe(0);
 });
 it("refuses evidence from another scope",async()=>{
  const x=setup({resolveClaims:async()=>[
   c("c1","A","B"),c("c2","B","C","positive",["e3"])]});
  await expect(x.pipeline.run(request)).rejects.toThrow(TypeError);
 });
 it("returns explicit conflicts without decisions",async()=>{
  const x=setup({resolveClaims:async()=>[
   c("c1","A","B"),c("c2","A","B","negative")]});
  const result=await x.pipeline.run(request);
  expect(result.status).toBe("explicit-conflicts");
  expect(result.contradictions).toHaveLength(1);
  expect(result.decisions).toEqual([]);
 });
 it("reports blocked inferred candidates",async()=>{
  const x=setup({resolveClaims:async()=>[
   c("c1","A","B"),c("c2","B","C"),
   c("c3","A","C","negative",["e1"])]});
  const result=await x.pipeline.run(request);
  expect(result.summary.blocked).toBe(1);
  expect(result.decisions[0].decision).toBe("blocked");
 });
 it("does not promote truncated context",async()=>{
  const x=setup();
  await expect(x.pipeline.run({...request,limit:1})).rejects.toThrow(TypeError);
 });
 it("does not promote truncated path exploration",async()=>{
  const x=setup({maxPaths:1,resolveClaims:async()=>[
   c("c1","A","B"),c("c2","B","C"),c("c3","C","D","positive",["e2"])]});
  const result=await x.pipeline.run(request);
  expect(result.status).toBe("incomplete-review");
  expect(result.decisions).toEqual([]);
 });
 it("propagates policy failures without fallback",async()=>{
  const x=setup({authorize:async()=>{throw new Error("policy offline");}});
  await expect(x.pipeline.run(request)).rejects.toThrow("policy offline");
  expect(x.reads()).toBe(0);
 });
 it("does not call resolver when access is denied",async()=>{
  const resolveClaims=vi.fn(async()=>[]);
  const x=setup({authorize:async()=>false,resolveClaims});
  await expect(x.pipeline.run(request)).rejects.toThrow();
  expect(resolveClaims).not.toHaveBeenCalled();
 });
 it("provides scope and authorized evidence to trusted resolver",async()=>{
  const resolveClaims=vi.fn(async()=>[]);
  const x=setup({resolveClaims});
  await x.pipeline.run(request);
  const input=resolveClaims.mock.calls[0][0];
  expect(input.authorization).toEqual(auth);
  expect(input.evidence.map(x=>x.id)).toEqual(["e1","e2"]);
 });
 it("is deterministic and freezes result",async()=>{
  const x=setup();
  const a=await x.pipeline.run(request),b=await x.pipeline.run(request);
  expect(a).toEqual(b);
  expect(Object.isFrozen(a.decisions[0].evidenceIds)).toBe(true);
 });
 it("validates dependencies and closed state",async()=>{
  expect(()=>createSecureReasoningPipeline()).toThrow(TypeError);
  const x=setup();x.pipeline.close();
  await expect(x.pipeline.run(request)).rejects.toThrow(/closed/);
 });
});

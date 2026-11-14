import {describe,it,expect} from "vitest";
import {createKnowledgeReasoningEngine} from "../knowledge-reasoning.engine.js";
import {createKnowledgeInferenceEngine,KNOWLEDGE_INFERENCE_VERSION}
 from "../knowledge-inference.engine.js";
const evidence=["e1","e2","e3","e4"].map(id=>({
 id,sourceId:id,sourceType:"graph",provenance:{origin:"knowledge-graph"}}));
const context={evidence,truncated:false};
const c=(id,subject,object,polarity="positive",predicate="ancestor_of")=>({
 id,subject,predicate,object,polarity,evidenceIds:["e"+id.slice(1)]});
const analyze=claims=>createKnowledgeReasoningEngine().analyze({context,claims});
const engine=()=>createKnowledgeInferenceEngine({transitivePredicates:["ancestor_of"]});
describe("Hyper Knowledge Inference v0.2.0",()=>{
 it("derives a two-hop fact with claim and evidence lineage",()=>{
  const result=engine().infer({analysis:analyze([c("c1","A","B"),c("c2","B","C")])});
  expect(result.version).toBe(KNOWLEDGE_INFERENCE_VERSION);
  expect(result.inferences).toEqual([{
   subject:"A",predicate:"ancestor_of",object:"C",polarity:"positive",
   rule:"transitive",hops:2,supportingClaimIds:["c1","c2"],evidenceIds:["e1","e2"]}]);
 });
 it("supports three-hop chains but respects hop limit",()=>{
  const analysis=analyze([c("c1","A","B"),c("c2","B","C"),c("c3","C","D")]);
  const result=engine().infer({analysis});
  expect(result.inferences.some(i=>i.subject==="A"&&i.object==="D"&&i.hops===3)).toBe(true);
  const short=createKnowledgeInferenceEngine({transitivePredicates:["ancestor_of"],maxHops:2});
  expect(short.infer({analysis}).inferences.some(i=>i.subject==="A"&&i.object==="D")).toBe(false);
 });
 it("never infers for predicates not on explicit allowlist",()=>{
  const result=createKnowledgeInferenceEngine().infer({
   analysis:analyze([c("c1","A","B"),c("c2","B","C")])});
  expect(result.inferences).toEqual([]);
 });
 it("does not infer through negative assertions",()=>{
  const result=engine().infer({analysis:analyze([
   c("c1","A","B"),c("c2","B","C","negative")])});
  expect(result.inferences).toEqual([]);
 });
 it("refuses contradictory input analysis",()=>{
  const analysis=analyze([c("c1","A","B"),c("c2","A","B","negative")]);
  expect(()=>engine().infer({analysis})).toThrow(TypeError);
 });
 it("does not override explicitly negative facts",()=>{
  const result=engine().infer({analysis:analyze([
   c("c1","A","B"),c("c2","B","C"),c("c3","A","C","negative")])});
  expect(result.inferences).toEqual([]);
 });
 it("avoids cycles and preserves deterministic immutable output",()=>{
  const analysis=analyze([c("c1","A","B"),c("c2","B","A"),c("c3","B","C")]);
  const a=engine().infer({analysis}),b=engine().infer({analysis});
  expect(a).toEqual(b);
  expect(a.inferences.some(i=>i.subject===i.object)).toBe(false);
  expect(Object.isFrozen(a.inferences)).toBe(true);
 });
 it("enforces output bounds and indicates truncation",()=>{
  const analysis=analyze([c("c1","A","B"),c("c2","B","C"),c("c3","C","D")]);
  const result=createKnowledgeInferenceEngine({
   transitivePredicates:["ancestor_of"],maxInferences:1}).infer({analysis});
  expect(result.inferences).toHaveLength(1);
  expect(result.truncated).toBe(true);
 });
 it("validates configuration and lifecycle",()=>{
  expect(()=>createKnowledgeInferenceEngine({maxHops:1})).toThrow(RangeError);
  expect(()=>createKnowledgeInferenceEngine({transitivePredicates:["x","x"]})).toThrow(TypeError);
  const x=engine();x.close();
  expect(()=>x.infer({analysis:analyze([])})).toThrow(/closed/);
 });
});

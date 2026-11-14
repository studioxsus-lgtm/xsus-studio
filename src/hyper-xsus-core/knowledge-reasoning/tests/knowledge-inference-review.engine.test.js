import {describe,it,expect} from "vitest";
import {createKnowledgeReasoningEngine} from "../knowledge-reasoning.engine.js";
import {createKnowledgeInferenceReview,KNOWLEDGE_INFERENCE_REVIEW_VERSION}
 from "../knowledge-inference-review.engine.js";
const evidence=["e1","e2","e3","e4"].map(id=>({
 id,sourceId:id,sourceType:"graph",provenance:{origin:"knowledge-graph"}}));
const context={truncated:false,evidence};
const claim=(id,subject,object,polarity="positive")=>({
 id,subject,predicate:"ancestor_of",object,polarity,evidenceIds:["e"+id.slice(1)]});
const analyze=claims=>createKnowledgeReasoningEngine().analyze({context,claims});
const review=()=>createKnowledgeInferenceReview({transitivePredicates:["ancestor_of"]});
describe("Hyper Knowledge Inference Review v0.3.0",()=>{
 it("reports a traceable candidate",()=>{
  const result=review().review({analysis:analyze([
   claim("c1","A","B"),claim("c2","B","C")])});
  expect(result.version).toBe(KNOWLEDGE_INFERENCE_REVIEW_VERSION);
  expect(result.candidates).toEqual([{
   subject:"A",predicate:"ancestor_of",object:"C",rule:"transitive",hops:2,
   supportingClaimIds:["c1","c2"],evidenceIds:["e1","e2"],
   conflictsWith:[],status:"candidate"}]);
 });
 it("flags a candidate contradicted by an explicit negative",()=>{
  const result=review().review({analysis:analyze([
   claim("c1","A","B"),claim("c2","B","C"),
   claim("c3","A","C","negative")])});
  expect(result.blockedCount).toBe(1);
  expect(result.candidates[0]).toMatchObject({
   status:"blocked-by-explicit-negative",conflictsWith:["c3"]});
 });
 it("does not infer unapproved predicates",()=>{
  const result=createKnowledgeInferenceReview().review({analysis:analyze([
   claim("c1","A","B"),claim("c2","B","C")])});
  expect(result.candidates).toEqual([]);
 });
 it("rejects explicitly contradictory analysis",()=>{
  const analysis=analyze([
   claim("c1","A","B"),claim("c2","A","B","negative")]);
  expect(()=>review().review({analysis})).toThrow(TypeError);
 });
 it("avoids self cycles",()=>{
  const result=review().review({analysis:analyze([
   claim("c1","A","B"),claim("c2","B","A")])});
  expect(result.candidates).toEqual([]);
 });
 it("respects hop limits",()=>{
  const analysis=analyze([
   claim("c1","A","B"),claim("c2","B","C"),claim("c3","C","D")]);
  const result=createKnowledgeInferenceReview({
   transitivePredicates:["ancestor_of"],maxHops:2}).review({analysis});
  expect(result.candidates.some(x=>x.subject==="A"&&x.object==="D")).toBe(false);
 });
 it("marks bounded exploration as truncated",()=>{
  const result=createKnowledgeInferenceReview({
   transitivePredicates:["ancestor_of"],maxPaths:1}).review({analysis:analyze([
   claim("c1","A","B"),claim("c2","B","C"),claim("c3","C","D")])});
  expect(result.truncated).toBe(true);
 });
 it("produces deterministic immutable output",()=>{
  const analysis=analyze([claim("c1","A","B"),claim("c2","B","C")]);
  const a=review().review({analysis}),b=review().review({analysis});
  expect(a).toEqual(b);
  expect(Object.isFrozen(a.candidates[0].evidenceIds)).toBe(true);
 });
 it("validates configuration and closed state",()=>{
  expect(()=>createKnowledgeInferenceReview({maxHops:1})).toThrow(RangeError);
  expect(()=>createKnowledgeInferenceReview({
   transitivePredicates:["x","x"]})).toThrow(TypeError);
  const r=review();r.close();
  expect(()=>r.review({analysis:analyze([])})).toThrow(/closed/);
 });
});

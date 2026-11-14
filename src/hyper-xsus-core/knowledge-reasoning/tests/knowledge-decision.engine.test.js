import {describe,it,expect} from "vitest";
import {createKnowledgeReasoningEngine} from "../knowledge-reasoning.engine.js";
import {createKnowledgeInferenceReview} from "../knowledge-inference-review.engine.js";
import {createKnowledgeRuleExplanationEngine} from "../knowledge-rule-explanation.engine.js";
import {createKnowledgeDecisionEngine,KNOWLEDGE_DECISION_VERSION}
 from "../knowledge-decision.engine.js";
const context={truncated:false,evidence:["e1","e2","e3","e4"].map(id=>({
 id,sourceId:id,sourceType:"graph",provenance:{origin:"knowledge-graph"}}))};
const claim=(id,s,o,polarity="positive",evidenceIds=["e"+id.slice(1)])=>({
 id,subject:s,predicate:"ancestor_of",object:o,polarity,evidenceIds});
const pipeline=claims=>{
 const analysis=createKnowledgeReasoningEngine().analyze({context,claims});
 const review=createKnowledgeInferenceReview({transitivePredicates:["ancestor_of"]}).review({analysis});
 const explanationResult=createKnowledgeRuleExplanationEngine({
  transitivePredicates:["ancestor_of"]}).explain({analysis,review});
 return {analysis,explanationResult};
};
const base=()=>pipeline([claim("c1","A","B"),claim("c2","B","C")]);
describe("Hyper Knowledge Decision v0.5.0",()=>{
 it("classifies a two-evidence chain as structurally eligible",()=>{
  const result=createKnowledgeDecisionEngine().decide(base());
  expect(result.version).toBe(KNOWLEDGE_DECISION_VERSION);
  expect(result.summary).toEqual({eligible:1,needsReview:0,blocked:0});
  expect(result.decisions[0]).toMatchObject({decision:"eligible",reasons:[],
   evidenceIds:["e1","e2"],supportingClaimIds:["c1","c2"]});
 });
 it("blocks a candidate with an explicit negative",()=>{
  const result=createKnowledgeDecisionEngine().decide(pipeline([
   claim("c1","A","B"),claim("c2","B","C"),claim("c3","A","C","negative")]));
  expect(result.decisions[0]).toMatchObject({
   decision:"blocked",reasons:["explicit-conflict"],conflictingClaimIds:["c3"]});
 });
 it("requires independent evidence identifiers rather than claim count",()=>{
  const data=pipeline([
   claim("c1","A","B","positive",["e1"]),
   claim("c2","B","C","positive",["e1"])]);
  const result=createKnowledgeDecisionEngine().decide(data);
  expect(result.decisions[0]).toMatchObject({
   decision:"needs-review",reasons:["insufficient-distinct-evidence"]});
 });
 it("enforces policy hop limits without deleting explanations",()=>{
  const data=pipeline([
   claim("c1","A","B"),claim("c2","B","C"),claim("c3","C","D")]);
  const result=createKnowledgeDecisionEngine({maxHops:2}).decide(data);
  expect(result.decisions.find(x=>x.subject==="A"&&x.object==="D"))
   .toMatchObject({decision:"needs-review",reasons:["hop-limit-exceeded"]});
 });
 it("rejects forged evidence identifiers",()=>{
  const data=base(),e=data.explanationResult.explanations[0];
  const forged={...data.explanationResult,explanations:[
   {...e,evidenceIds:["e4"]}]};
  expect(()=>createKnowledgeDecisionEngine().decide({
   analysis:data.analysis,explanationResult:forged})).toThrow(TypeError);
 });
 it("rejects forged blocker status",()=>{
  const data=base(),e=data.explanationResult.explanations[0];
  const forged={...data.explanationResult,explanations:[
   {...e,status:"blocked-by-explicit-negative",conflictingClaimIds:["c3"]}]};
  expect(()=>createKnowledgeDecisionEngine().decide({
   analysis:data.analysis,explanationResult:forged})).toThrow(TypeError);
 });
 it("rejects reordered lineage",()=>{
  const data=base(),e=data.explanationResult.explanations[0];
  const forged={...data.explanationResult,explanations:[{
   ...e,steps:[{step:1,claimId:"c2"},{step:2,claimId:"c1"}]}]};
  expect(()=>createKnowledgeDecisionEngine().decide({
   analysis:data.analysis,explanationResult:forged})).toThrow(TypeError);
 });
 it("rejects incomplete or conflicting analyses",()=>{
  const data=base();
  expect(()=>createKnowledgeDecisionEngine().decide({
   ...data,analysis:{...data.analysis,status:"conflicting"}})).toThrow(TypeError);
 });
 it("enforces max decisions and configuration",()=>{
  const data=base();
  expect(()=>createKnowledgeDecisionEngine({minEvidence:0})).toThrow(RangeError);
  const e=data.explanationResult.explanations[0];
  const extra={...e,subject:"X"};
  expect(()=>createKnowledgeDecisionEngine({maxDecisions:1}).decide({
   analysis:data.analysis,explanationResult:{
    ...data.explanationResult,explanations:[e,extra]}})).toThrow(RangeError);
 });
 it("returns immutable deterministic results and supports close",()=>{
  const data=base(),x=createKnowledgeDecisionEngine();
  const a=x.decide(data),b=x.decide(data);
  expect(a).toEqual(b);
  expect(Object.isFrozen(a.decisions[0].evidenceIds)).toBe(true);
  x.close();expect(()=>x.decide(data)).toThrow(/closed/);
 });
});

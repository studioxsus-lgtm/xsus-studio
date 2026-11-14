import {describe,it,expect} from "vitest";
import {createKnowledgeReasoningEngine} from "../knowledge-reasoning.engine.js";
import {createKnowledgeInferenceReview} from "../knowledge-inference-review.engine.js";
import {createKnowledgeRuleExplanationEngine,KNOWLEDGE_RULE_EXPLANATION_VERSION}
 from "../knowledge-rule-explanation.engine.js";
const context={truncated:false,evidence:["e1","e2","e3"].map(id=>({
 id,sourceId:id,sourceType:"graph",provenance:{origin:"knowledge-graph"}}))};
const claim=(id,subject,object,polarity="positive")=>({
 id,subject,predicate:"ancestor_of",object,polarity,evidenceIds:["e"+id.slice(1)]});
const analysis=claims=>createKnowledgeReasoningEngine().analyze({context,claims});
const review=a=>createKnowledgeInferenceReview({
 transitivePredicates:["ancestor_of"]}).review({analysis:a});
const engine=()=>createKnowledgeRuleExplanationEngine({transitivePredicates:["ancestor_of"]});
const setup=()=>{const a=analysis([claim("c1","A","B"),claim("c2","B","C")]);
 return {a,r:review(a)};};
describe("Hyper Knowledge Rule Explanation v0.4.0",()=>{
 it("verifies lineage and emits structured explanation",()=>{
  const {a,r}=setup(),out=engine().explain({analysis:a,review:r});
  expect(out.version).toBe(KNOWLEDGE_RULE_EXPLANATION_VERSION);
  expect(out.explanations).toEqual([{
   subject:"A",predicate:"ancestor_of",object:"C",status:"candidate",rule:"transitive",
   steps:[{step:1,claimId:"c1"},{step:2,claimId:"c2"}],
   evidenceIds:["e1","e2"],conflictingClaimIds:[]}]);
 });
 it("preserves and verifies explicit negative blockers",()=>{
  const a=analysis([claim("c1","A","B"),claim("c2","B","C"),
   claim("c3","A","C","negative")]);
  const out=engine().explain({analysis:a,review:review(a)});
  expect(out.blockedCount).toBe(1);
  expect(out.explanations[0].conflictingClaimIds).toEqual(["c3"]);
 });
 it("rejects fabricated evidence lineage",()=>{
  const {a,r}=setup();
  const forged={...r,candidates:[{...r.candidates[0],evidenceIds:["e3"]}]};
  expect(()=>engine().explain({analysis:a,review:forged})).toThrow(TypeError);
 });
 it("rejects reversed claim steps",()=>{
  const {a,r}=setup();
  const forged={...r,candidates:[{...r.candidates[0],
   supportingClaimIds:["c2","c1"]}]};
  expect(()=>engine().explain({analysis:a,review:forged})).toThrow(TypeError);
 });
 it("rejects forged blocker status",()=>{
  const {a,r}=setup();
  const forged={...r,candidates:[{...r.candidates[0],
   status:"blocked-by-explicit-negative",conflictsWith:["c3"]}]};
  expect(()=>engine().explain({analysis:a,review:forged})).toThrow(TypeError);
 });
 it("rejects truncated review rather than presenting incomplete explanations",()=>{
  const {a,r}=setup();
  expect(()=>engine().explain({analysis:a,review:{...r,truncated:true}}))
   .toThrow(TypeError);
 });
 it("rejects rules not in allowlist",()=>{
  const {a,r}=setup();
  expect(()=>createKnowledgeRuleExplanationEngine().explain({
   analysis:a,review:r})).toThrow(TypeError);
 });
 it("rejects contradictory analysis",()=>{
  const a=analysis([claim("c1","A","B"),claim("c2","A","B","negative")]);
  expect(()=>engine().explain({analysis:a,review:{truncated:false,candidates:[]}}))
   .toThrow(TypeError);
 });
 it("produces frozen output and enforces lifecycle",()=>{
  const {a,r}=setup(),x=engine(),out=x.explain({analysis:a,review:r});
  expect(Object.isFrozen(out.explanations[0].steps)).toBe(true);
  x.close();
  expect(()=>x.explain({analysis:a,review:r})).toThrow(/closed/);
 });
});

import {describe,it,expect} from "vitest";
import {createKnowledgeContextEngine} from "../../knowledge-context/knowledge-context.engine.js";
import {createSecureGraphEvidenceProvider} from "../../knowledge-context/secure-graph-evidence.provider.js";
import {createKnowledgeReasoningEngine} from "../knowledge-reasoning.engine.js";
import {createKnowledgeInferenceReview} from "../knowledge-inference-review.engine.js";
import {createKnowledgeRuleExplanationEngine} from "../knowledge-rule-explanation.engine.js";
import {createKnowledgeDecisionEngine} from "../knowledge-decision.engine.js";
const nodes=[
 {id:"e1",label:"Alpha ancestor",metadata:{accessScope:"team-a"}},
 {id:"e2",label:"Alpha relation",metadata:{accessScope:"team-a"}},
 {id:"e3",label:"Alpha secret",metadata:{accessScope:"team-b"}}
];
const claim=(id,s,o,evidenceIds)=>({
 id,subject:s,predicate:"ancestor_of",object:o,polarity:"positive",evidenceIds});
const auth={principalId:"alice",scope:"team-a"};
function setup(authorize=async()=>true){
 let reads=0;
 const provider=createSecureGraphEvidenceProvider({
  graph:{getGraph(){reads++;return {nodes};}},authorize});
 const contextEngine=createKnowledgeContextEngine({provider});
 return {contextEngine,reads:()=>reads};
}
function decide(context,claims){
 const analysis=createKnowledgeReasoningEngine().analyze({context,claims});
 const review=createKnowledgeInferenceReview({
  transitivePredicates:["ancestor_of"]}).review({analysis});
 const explanationResult=createKnowledgeRuleExplanationEngine({
  transitivePredicates:["ancestor_of"]}).explain({analysis,review});
 return createKnowledgeDecisionEngine().decide({analysis,explanationResult});
}
describe("Hyper Knowledge secure context to decision integration v0.5.0",()=>{
 it("produces eligible inference from authorized evidence only",async()=>{
  const {contextEngine}=setup();
  const context=await contextEngine.build({query:"Alpha",authorization:auth});
  const result=decide(context,[claim("c1","A","B",["e1"]),
   claim("c2","B","C",["e2"])]);
  expect(result.summary.eligible).toBe(1);
  expect(JSON.stringify(result)).not.toContain("e3");
 });
 it("cannot launder evidence from another scope into reasoning",async()=>{
  const {contextEngine}=setup();
  const context=await contextEngine.build({query:"Alpha",authorization:auth});
  expect(()=>decide(context,[claim("c1","A","B",["e1"]),
   claim("c2","B","C",["e3"])])).toThrow(TypeError);
 });
 it("denied authorization prevents graph access",async()=>{
  const x=setup(async()=>false);
  await expect(x.contextEngine.build({query:"Alpha",authorization:auth}))
   .rejects.toMatchObject({code:"XSUS_EVIDENCE_ACCESS_DENIED"});
  expect(x.reads()).toBe(0);
 });
 it("truncated context cannot enter the reasoning pipeline",async()=>{
  const {contextEngine}=setup();
  const context=await contextEngine.build({query:"Alpha",limit:1,authorization:auth});
  expect(context.truncated).toBe(true);
  expect(()=>decide(context,[])).toThrow(TypeError);
 });
});

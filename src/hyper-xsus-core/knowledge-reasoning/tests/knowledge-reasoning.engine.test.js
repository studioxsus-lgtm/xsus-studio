import {describe,it,expect} from "vitest";
import {createKnowledgeReasoningEngine,KNOWLEDGE_REASONING_VERSION}
 from "../knowledge-reasoning.engine.js";
const context={truncated:false,evidence:[
 {id:"e1",sourceId:"n1",sourceType:"graph",provenance:{origin:"knowledge-graph"}},
 {id:"e2",sourceId:"n2",sourceType:"graph",provenance:{origin:"knowledge-graph"}}
]};
const claim=(id,polarity,evidenceId)=>({id,subject:"A",predicate:"supports",object:"B",
 polarity,evidenceIds:[evidenceId]});
describe("Hyper Knowledge Reasoning v0.1.0",()=>{
 it("reports version and empty deterministic result",()=>{
  const engine=createKnowledgeReasoningEngine();
  expect(engine.analyze({context,claims:[]})).toMatchObject({
   version:KNOWLEDGE_REASONING_VERSION,status:"no-explicit-conflicts",contradictions:[]});
 });
 it("detects explicit opposite-polarity contradiction with provenance references",()=>{
  const result=createKnowledgeReasoningEngine().analyze({context,
   claims:[claim("c2","negative","e2"),claim("c1","positive","e1")]});
  expect(result.contradictions).toEqual([{
   positiveClaimId:"c1",negativeClaimId:"c2",evidenceIds:["e1","e2"]}]);
  expect(result.status).toBe("conflicting");
 });
 it("does not infer contradiction between unrelated facts",()=>{
  const result=createKnowledgeReasoningEngine().analyze({context,claims:[
   claim("c1","positive","e1"),
   {...claim("c2","negative","e2"),object:"C"}]});
  expect(result.contradictions).toEqual([]);
 });
 it("rejects fabricated evidence IDs",()=>{
  expect(()=>createKnowledgeReasoningEngine().analyze({context,
   claims:[claim("c1","positive","unknown")]})).toThrow(TypeError);
 });
 it("rejects incomplete context to avoid silent false certainty",()=>{
  expect(()=>createKnowledgeReasoningEngine().analyze({
   context:{...context,truncated:true},claims:[]})).toThrow(TypeError);
 });
 it("rejects duplicate claim IDs and evidence IDs",()=>{
  const engine=createKnowledgeReasoningEngine();
  expect(()=>engine.analyze({context,claims:[
   claim("same","positive","e1"),claim("same","negative","e2")]})).toThrow(TypeError);
  expect(()=>engine.analyze({context,claims:[
   {...claim("c1","positive","e1"),evidenceIds:["e1","e1"]}]})).toThrow(TypeError);
 });
 it("deep freezes outputs without mutating input",()=>{
  const claims=[claim("c1","positive","e1")];
  const result=createKnowledgeReasoningEngine().analyze({context,claims});
  expect(Object.isFrozen(result.claims[0].evidenceIds)).toBe(true);
  expect(()=>{result.claims[0].evidenceIds.push("x");}).toThrow(TypeError);
  expect(Object.isFrozen(claims[0])).toBe(false);
 });
 it("enforces bounds and lifecycle",()=>{
  expect(()=>createKnowledgeReasoningEngine({maxClaims:0})).toThrow(RangeError);
  const engine=createKnowledgeReasoningEngine({maxClaims:1});
  expect(()=>engine.analyze({context,claims:[
   claim("c1","positive","e1"),claim("c2","negative","e2")]})).toThrow(TypeError);
  engine.close();
  expect(()=>engine.analyze({context,claims:[]})).toThrow(/closed/);
 });
});

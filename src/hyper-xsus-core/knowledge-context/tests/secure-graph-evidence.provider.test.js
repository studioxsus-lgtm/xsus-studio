import {describe,it,expect} from "vitest";
import {createKnowledgeContextEngine} from "../knowledge-context.engine.js";
import {createSecureGraphEvidenceProvider} from "../secure-graph-evidence.provider.js";
const nodes=[
 {id:"a",label:"Alpha shared",metadata:{accessScope:"team-a"}},
 {id:"b",label:"Alpha secret",metadata:{accessScope:"team-b"}},
 {id:"c",label:"Alpha unscoped"},
 {id:"d",label:"Alpha another",metadata:{accessScope:"team-a"}}
];
const auth={principalId:"alice",scope:"team-a"};
function setup({authorize=async()=>true}={}){
 let reads=0;
 const graph={getGraph(){reads++;return {nodes};}};
 const provider=createSecureGraphEvidenceProvider({graph,authorize});
 const engine=createKnowledgeContextEngine({provider});
 return {provider,engine,reads:()=>reads};
}
describe("Hyper Knowledge Context scoped evidence v0.2.0",()=>{
 it("returns only matching authorized scope and provenance",async()=>{
  const x=setup();
  const result=await x.engine.build({query:"Alpha",authorization:auth});
  expect(result.evidence.map(e=>e.sourceId)).toEqual(["a","d"]);
  expect(result.evidence.every(e=>e.provenance.origin==="knowledge-graph")).toBe(true);
 });
 it("denies requests without trusted principal before reading",async()=>{
  const x=setup();
  await expect(x.engine.build({query:"Alpha",authorization:{scope:"team-a"}}))
   .rejects.toMatchObject({code:"XSUS_EVIDENCE_ACCESS_DENIED"});
  expect(x.reads()).toBe(0);
 });
 it("denies explicitly rejected scope without reading",async()=>{
  const x=setup({authorize:async()=>false});
  await expect(x.engine.build({query:"Alpha",authorization:auth}))
   .rejects.toMatchObject({code:"XSUS_EVIDENCE_ACCESS_DENIED"});
  expect(x.reads()).toBe(0);
 });
 it("does not leak data from other scopes or unscoped nodes",async()=>{
  const x=setup();
  const result=await x.engine.build({query:"Alpha",authorization:auth});
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(JSON.stringify(result)).not.toContain("unscoped");
 });
 it("propagates authorization failures without falling back",async()=>{
  const x=setup({authorize:async()=>{throw new Error("policy unavailable");}});
  await expect(x.engine.build({query:"Alpha",authorization:auth}))
   .rejects.toThrow("policy unavailable");
  expect(x.reads()).toBe(0);
 });
 it("rejects missing policy and malformed graph nodes",async()=>{
  expect(()=>createSecureGraphEvidenceProvider({graph:{getGraph:()=>({nodes})}}))
   .toThrow(TypeError);
  const provider=createSecureGraphEvidenceProvider({
   graph:{getGraph:()=>({nodes:[null]})},authorize:async()=>true
  });
  await expect(provider.getEvidence({query:"Alpha",limit:5,authorization:auth}))
   .rejects.toThrow(TypeError);
 });
 it("is deterministic and honors evidence limits",async()=>{
  const x=setup();
  const result=await x.engine.build({query:"Alpha",limit:1,authorization:auth});
  expect(result.evidence.map(e=>e.id)).toEqual(["a"]);
  expect(result.truncated).toBe(true);
 });
});

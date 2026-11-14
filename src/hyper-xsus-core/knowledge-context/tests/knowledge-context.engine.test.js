import {describe,it,expect} from "vitest";
import {createKnowledgeContextEngine,createGraphEvidenceProvider,KNOWLEDGE_CONTEXT_VERSION}
 from "../knowledge-context.engine.js";
const auth={scope:"public"};
const item=(id)=>({id,sourceType:"graph",sourceId:id,content:"Evidence "+id,
 provenance:{origin:"knowledge-graph"}});
describe("Hyper Knowledge Context v0.1.0",()=>{
 it("creates immutable deterministic context with provenance",async()=>{
  const engine=createKnowledgeContextEngine({provider:{getEvidence:async()=>[item("b"),item("a")]}});
  const result=await engine.build({query:"test",authorization:auth});
  expect(result.version).toBe(KNOWLEDGE_CONTEXT_VERSION);
  expect(result.evidence.map(e=>e.id)).toEqual(["a","b"]);
  expect(Object.isFrozen(result.evidence[0].provenance)).toBe(true);
  expect(()=>{result.evidence[0].content="changed";}).toThrow(TypeError);
 });
 it("rejects missing authorization before provider invocation",async()=>{
  let calls=0;
  const engine=createKnowledgeContextEngine({provider:{getEvidence:async()=>{calls++;return [];}}});
  await expect(engine.build({query:"test"})).rejects.toThrow(TypeError);
  expect(calls).toBe(0);
 });
 it("returns no-evidence snapshot",async()=>{
  const engine=createKnowledgeContextEngine({provider:{getEvidence:async()=>[]}});
  expect(await engine.build({query:"missing",authorization:auth}))
   .toMatchObject({evidence:[],truncated:false});
 });
 it("deduplicates source references and enforces limits",async()=>{
  const engine=createKnowledgeContextEngine({maxEvidence:2,provider:{getEvidence:async()=>[
   item("c"),item("a"),item("a"),item("b")]}});
  const result=await engine.build({query:"test",limit:2,authorization:auth});
  expect(result.evidence.map(e=>e.id)).toEqual(["a","b"]);
  expect(result.truncated).toBe(true);
 });
 it("fails closed for invalid evidence or provenance",async()=>{
  const engine=createKnowledgeContextEngine({provider:{getEvidence:async()=>[
   {...item("a"),provenance:{}}]}});
  await expect(engine.build({query:"test",authorization:auth})).rejects.toThrow(TypeError);
 });
 it("does not mutate the graph public API",async()=>{
  let writes=0;
  const graph={getGraph:()=>({nodes:[{id:"n1",label:"JavaScript"},{id:"n2",label:"Python"}]}),
   addNode:()=>{writes++;}};
  const engine=createKnowledgeContextEngine({provider:createGraphEvidenceProvider({graph})});
  const result=await engine.build({query:"JavaScript",authorization:auth});
  expect(result.evidence.map(e=>e.sourceId)).toEqual(["n1"]);
  expect(writes).toBe(0);
 });
 it("rejects invalid inputs and closed engine",async()=>{
  const engine=createKnowledgeContextEngine({provider:{getEvidence:async()=>[]}});
  await expect(engine.build({query:"",authorization:auth})).rejects.toThrow(TypeError);
  await expect(engine.build({query:"ok",limit:1000,authorization:auth})).rejects.toThrow(RangeError);
  engine.close();
  await expect(engine.build({query:"ok",authorization:auth})).rejects.toThrow(/closed/);
 });
});

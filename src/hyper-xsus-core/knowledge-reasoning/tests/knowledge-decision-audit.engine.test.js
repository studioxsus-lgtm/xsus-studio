import {describe,it,expect} from "vitest";
import {createKnowledgeDecisionAudit,KNOWLEDGE_DECISION_AUDIT_VERSION}
 from "../knowledge-decision-audit.engine.js";
const decision={subject:"A",predicate:"ancestor_of",object:"C",decision:"eligible",
 reasons:[],evidenceIds:["e1","e2"],supportingClaimIds:["c1","c2"],
 conflictingClaimIds:[]};
const result=(decisions=[decision])=>({
 version:"0.6.0",status:"reviewed",evidenceCount:2,
 decisions,contradictions:[],
 summary:{eligible:decisions.length,needsReview:0,blocked:0}});
describe("Hyper Decision Audit v0.7.0",()=>{
 it("generates deterministic SHA-256 receipts",()=>{
  const x=createKnowledgeDecisionAudit();
  const a=x.record({result:result()});
  expect(a.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(a.previousHash).toBe("GENESIS");
  expect(x.verify()).toBe(true);
 });
 it("chains consecutive receipts",()=>{
  const x=createKnowledgeDecisionAudit();
  const a=x.record({result:result()});
  const b=x.record({result:result()});
  expect(b.previousHash).toBe(a.hash);
  expect(b.sequence).toBe(2);
 });
 it("preserves integrity after bounded eviction",()=>{
  const x=createKnowledgeDecisionAudit({maxEntries:2});
  const a=x.record({result:result()});
  x.record({result:result()});x.record({result:result()});
  const snap=x.snapshot();
  expect(snap.entries).toHaveLength(2);
  expect(snap.anchorHash).toBe(a.hash);
  expect(snap.valid).toBe(true);
 });
 it("does not retain personal data or raw evidence",()=>{
  const x=createKnowledgeDecisionAudit();
  x.record({result:{...result(),query:"secret",principalId:"alice",
   evidence:[{content:"private"}]}});
  const snapshot=x.snapshot();
  const receipt=snapshot.entries[0];
  expect(Object.keys(receipt).sort()).toEqual([
   "contradictionDigest","decisionDigest","evidenceCount","hash",
   "previousHash","sequence","status","summary"].sort());
  expect(Object.keys(snapshot).sort()).toEqual([
   "anchorHash","entries","valid","version"].sort());
  expect(receipt.decisionDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.contradictionDigest).toMatch(/^[a-f0-9]{64}$/);
  const serialized=JSON.stringify(snapshot);
  for(const sensitive of ["secret","alice","private","evidenceIds",
   "supportingClaimIds","principalId","query","content"])
   expect(serialized).not.toContain('"' + sensitive + '"');
  expect(snapshot.valid).toBe(true);
 });
 it("rejects inconsistent summary counts",()=>{
  const x=createKnowledgeDecisionAudit();
  expect(()=>x.record({result:{...result(),
   summary:{eligible:0,needsReview:0,blocked:0}}})).toThrow(TypeError);
 });
 it("rejects non-reviewed results containing decisions",()=>{
  const x=createKnowledgeDecisionAudit();
  expect(()=>x.record({result:{...result(),status:"incomplete-review"}}))
   .toThrow(TypeError);
 });
 it("accepts incomplete review without decisions",()=>{
  const x=createKnowledgeDecisionAudit();
  const r={...result([]),status:"incomplete-review"};
  expect(x.record({result:r}).status).toBe("incomplete-review");
 });
 it("accepts explicit conflict without decisions",()=>{
  const x=createKnowledgeDecisionAudit();
  const r={...result([]),status:"explicit-conflicts",
   contradictions:[{positiveClaimId:"c1",negativeClaimId:"c2"}]};
  expect(x.record({result:r}).status).toBe("explicit-conflicts");
 });
 it("rejects malformed result and capacity",()=>{
  expect(()=>createKnowledgeDecisionAudit({maxEntries:0})).toThrow(RangeError);
  expect(()=>createKnowledgeDecisionAudit().record({result:{}})).toThrow(TypeError);
 });
 it("freezes snapshots and entries",()=>{
  const x=createKnowledgeDecisionAudit();x.record({result:result()});
  const s=x.snapshot();
  expect(s.version).toBe(KNOWLEDGE_DECISION_AUDIT_VERSION);
  expect(Object.isFrozen(s.entries)).toBe(true);
  expect(Object.isFrozen(s.entries[0])).toBe(true);
 });
 it("enforces close for new records",()=>{
  const x=createKnowledgeDecisionAudit();x.close();
  expect(()=>x.record({result:result()})).toThrow(/closed/);
 });
 it("maintains validity across 1000 sequential entries",()=>{
  const x=createKnowledgeDecisionAudit({maxEntries:128});
  for(let i=0;i<1000;i++)x.record({result:result()});
  expect(x.snapshot().entries).toHaveLength(128);
  expect(x.verify()).toBe(true);
 });
});

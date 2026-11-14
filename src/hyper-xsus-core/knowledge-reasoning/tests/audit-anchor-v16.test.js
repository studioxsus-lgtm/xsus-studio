import {describe,it,expect} from "vitest";
import {createAuditAnchorVerifier} from "../audit-anchor-verifier.js";
const key="s".repeat(48);
const verifier=()=>createAuditAnchorVerifier({key,keyId:"primary-2026"});
const hash=x=>x.repeat(64);
const snap=(entries,anchorHash="GENESIS",lastSequence=entries.at(-1)?.sequence??0)=>
 ({version:"0.8.0",entries,anchorHash,lastSequence});
const entry=(sequence,h)=>({sequence,hash:h});
describe("Hyper Audit v1.6.0 — externally keyed anchors",()=>{
 it("creates and verifies a signed checkpoint",()=>{
  const v=verifier(),s=snap([entry(1,hash("a"))]);
  const a=v.createAnchor(s);
  expect(a.algorithm).toBe("HMAC-SHA256");
  expect(v.verifyAnchor(s,a)).toBe(true);
 });
 it("rejects a forged signature",()=>{
  const v=verifier(),s=snap([entry(1,hash("a"))]);
  const a=v.createAnchor(s);
  expect(()=>v.verifyAnchor(s,{...a,signature:hash("0")}))
   .toThrowError(/signature mismatch/);
 });
 it("rejects a rollback against an anchor",()=>{
  const v=verifier(),a=v.createAnchor(snap([entry(1,hash("a")),entry(2,hash("b"))]));
  expect(()=>v.verifyAnchor(snap([entry(1,hash("a"))]),a))
   .toMatchObject({code:"XSUS_AUDIT_ANCHOR_ROLLBACK"});
 });
 it("rejects a divergent tip at the same sequence",()=>{
  const v=verifier(),a=v.createAnchor(snap([entry(1,hash("a"))]));
  expect(()=>v.verifyAnchor(snap([entry(1,hash("b"))]),a))
   .toMatchObject({code:"XSUS_AUDIT_ANCHOR_FORK"});
 });
 it("allows forward progress with matching retained history",()=>{
  const v=verifier(),a=v.createAnchor(snap([entry(1,hash("a"))]));
  expect(v.verifyAnchor(snap([entry(1,hash("a")),entry(2,hash("b"))]),a)).toBe(true);
 });
 it("allows forward progress when the anchor is the retention boundary",()=>{
  const v=verifier(),a=v.createAnchor(snap([entry(1,hash("a"))]));
  expect(v.verifyAnchor(snap([entry(2,hash("b"))],hash("a")) ,a)).toBe(true);
 });
 it("fails closed when anchor history is no longer observable",()=>{
  const v=verifier(),a=v.createAnchor(snap([entry(1,hash("a"))]));
  expect(()=>v.verifyAnchor(snap([entry(3,hash("c"))],hash("b")),a))
   .toMatchObject({code:"XSUS_AUDIT_ANCHOR_UNVERIFIABLE"});
 });
 it("rejects mismatched signing keys",()=>{
  const s=snap([entry(1,hash("a"))]),a=verifier().createAnchor(s);
  const other=createAuditAnchorVerifier({key:"x".repeat(48),keyId:"primary-2026"});
  expect(()=>other.verifyAnchor(s,a)).toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
 });
 it("rejects short keys",()=>{
  expect(()=>createAuditAnchorVerifier({key:"weak",keyId:"primary-2026"})).toThrow();
 });
});

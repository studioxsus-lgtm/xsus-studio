import {describe,it,expect} from "vitest";
import {verifyReviewAuditChain} from "../../next-engines/orchestration/review-audit-chain.js";
const item=(id,errorCode)=>({requestId:id,traceId:"trace-"+id,
 assessment:{state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation",
 ...(errorCode?{errorCode}:{})}});
const batch=items=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:items});
const a=()=>batch([item("a"),item("b")]);
describe("Hyper phase 57 — bounded audit continuity chain",()=>{
 it("observes a stable three-snapshot chain without authorizing recovery",()=>{
  const result=verifyReviewAuditChain({snapshots:[a(),a(),a()]});
  expect(result).toMatchObject({state:"chain_observed",executionAuthorized:false,
   recoveryAuthorized:false,retrySafe:false,sideEffects:false});
  expect(result.links).toHaveLength(2);
  expect(result.headFingerprint).toMatch(/^[a-f0-9]{64}$/);
 });
 it("blocks drift in a middle snapshot and every affected link",()=>{
  const changed=batch([item("a","DRIFT"),item("b")]);
  const result=verifyReviewAuditChain({snapshots:[a(),changed,a()]});
  expect(result.state).toBe("chain_blocked");
  expect(result.links.map(x=>x.state)).toEqual(["continuity_blocked","continuity_blocked"]);
  expect(result.findings).toContain("CHAIN_LINK_UNVERIFIED");
 });
 it("keeps chain hash sensitive to ordering",()=>{
  const reversed=batch([item("b"),item("a")]);
  const one=verifyReviewAuditChain({snapshots:[a(),a()]});
  const two=verifyReviewAuditChain({snapshots:[a(),reversed]});
  expect(one.headFingerprint).not.toBe(two.headFingerprint);
  expect(two.executionAuthorized).toBe(false);
 });
 it("blocks invalid snapshots instead of leaking their content",()=>{
  const invalid=batch([{...item("secret-id"),assessment:{
   ...item("secret-id").assessment,executionAuthorized:true}}]);
  const result=verifyReviewAuditChain({snapshots:[invalid,invalid]});
  expect(result.state).toBe("chain_blocked");
  expect(JSON.stringify(result)).not.toContain("secret-id");
 });
 it("rejects undersized or oversized chains",()=>{
  expect(()=>verifyReviewAuditChain({snapshots:[a()]})).toThrow();
  expect(()=>verifyReviewAuditChain({snapshots:Array.from({length:17},a)})).toThrow();
 });
 it("rejects invalid chain limits",()=>{
  expect(()=>verifyReviewAuditChain({snapshots:[a(),a()],maxSnapshots:33})).toThrow();
  expect(()=>verifyReviewAuditChain({snapshots:[a(),a()],maxSnapshots:1})).toThrow();
 });
});

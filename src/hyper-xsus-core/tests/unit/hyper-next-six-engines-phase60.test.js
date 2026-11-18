import {describe,it,expect} from "vitest";
import {authenticateReviewAuditChain} from "../../next-engines/orchestration/review-authenticated-audit-chain.js";
import {createReviewAuditKeyRotationGuard} from "../../next-engines/orchestration/review-audit-key-rotation.js";
const active=Buffer.alloc(32,1),retired=Buffer.alloc(32,2);
const snapshot=()=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:[{requestId:"r",traceId:"t",
 assessment:{state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"}}]});
const observations=()=>[{sequence:1,observationId:"a",snapshot:snapshot()},
 {sequence:2,observationId:"b",snapshot:snapshot()}];
const receipt=(key=active,keyId="current")=>authenticateReviewAuditChain({
 observations:observations(),key,keyId});
const guard=(options={})=>createReviewAuditKeyRotationGuard({
 keys:{current:active,old:retired},activeKeyId:"current",...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 60 — active keys and local replay guard",()=>{
 it("accepts an active-key receipt once without authorizing recovery",()=>{
  const result=guard().verify({observations:observations(),receipt:receipt()});
  expect(result.state).toBe("authenticated_for_manual_review");denied(result);
 });
 it("rejects reuse of an already accepted receipt",()=>{
  const g=guard(),r=receipt();
  expect(g.verify({observations:observations(),receipt:r}).state)
   .toBe("authenticated_for_manual_review");
  const result=g.verify({observations:observations(),receipt:r});
  expect(result.findings).toContain("RECEIPT_REPLAYED");denied(result);
 });
 it("rejects receipts signed with a retired key",()=>{
  const result=guard().verify({observations:observations(),
   receipt:receipt(retired,"old")});
  expect(result.findings).toContain("RETIRED_KEY");denied(result);
 });
 it("rejects unknown key identifiers",()=>{
  const result=guard().verify({observations:observations(),
   receipt:receipt(Buffer.alloc(32,3),"unknown")});
  expect(result.findings).toContain("UNKNOWN_KEY");denied(result);
 });
 it("fails closed when replay registry capacity is exhausted",()=>{
  const g=guard({maxReceipts:1});
  expect(g.verify({observations:observations(),receipt:receipt()}).state)
   .toBe("authenticated_for_manual_review");
  const changed=observations();changed[0].observationId="new";
  changed[1].observationId="new2";
  const signed=authenticateReviewAuditChain({observations:changed,
   key:active,keyId:"current"});
  const result=g.verify({observations:changed,receipt:signed});
  expect(result.findings).toContain("REPLAY_REGISTRY_FULL");denied(result);
 });
 it("rejects invalid key material and does not invoke receipt accessors",()=>{
  expect(()=>guard({keys:{current:Buffer.alloc(8)}})).toThrow();
  const hostile={...receipt()};
  Object.defineProperty(hostile,"keyId",{get(){throw Error("getter");}});
  const result=guard().verify({observations:observations(),receipt:hostile});
  expect(result.state).toBe("authentication_blocked");denied(result);
 });
});

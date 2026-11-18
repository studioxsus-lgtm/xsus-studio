import {describe,it,expect} from "vitest";
import {authenticateReviewAuditChain,verifyAuthenticatedReviewAuditChain} from "../../next-engines/orchestration/review-authenticated-audit-chain.js";
const key=Buffer.alloc(32,7),wrong=Buffer.alloc(32,8);
const snapshot=()=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:[{requestId:"r",traceId:"t",
 assessment:{state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"}}]});
const observations=()=>[{sequence:1,observationId:"a",snapshot:snapshot()},
 {sequence:2,observationId:"b",snapshot:snapshot()}];
const sign=(items=observations())=>authenticateReviewAuditChain({
 observations:items,key,keyId:"test-key"});
const verify=(receipt,items=observations(),secret=key)=>verifyAuthenticatedReviewAuditChain({
 observations:items,key:secret,keyId:"test-key",receipt});
describe("Hyper phase 59 — authenticated audit chain",()=>{
 it("authenticates an unchanged chain without granting recovery",()=>{
  const receipt=sign();
  expect(receipt.state).toBe("authenticated_for_manual_review");
  const result=verify(receipt);
  expect(result).toMatchObject({state:"authenticated_for_manual_review",
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false});
 });
 it("rejects an incorrect signing key",()=>{
  expect(verify(sign(),observations(),wrong).state).toBe("authentication_blocked");
 });
 it("rejects tampered authentication tags",()=>{
  const receipt={...sign(),authenticationTag:"0".repeat(64)};
  expect(verify(receipt).state).toBe("authentication_blocked");
 });
 it("rejects changes to observation sequence after signing",()=>{
  const items=observations();items[1].sequence=3;
  expect(verify(sign(),items).state).toBe("authentication_blocked");
 });
 it("rejects a replayed observation identity before signing",()=>{
  const items=observations();items[1].observationId="a";
  expect(sign(items).state).toBe("authentication_blocked");
 });
 it("rejects short keys and receipt accessors",()=>{
  expect(()=>authenticateReviewAuditChain({
   observations:observations(),key:Buffer.alloc(8),keyId:"test-key"})).toThrow();
  const receipt={...sign()};
  Object.defineProperty(receipt,"authenticationTag",{get(){throw Error("getter");}});
  expect(verify(receipt).state).toBe("authentication_blocked");
 });
});

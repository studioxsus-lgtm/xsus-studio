import {describe,it,expect} from "vitest";
import {verifySequencedReviewAuditChain} from "../../next-engines/orchestration/review-sequenced-audit-chain.js";
const snapshot=()=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:[{requestId:"r",traceId:"t",
 assessment:{state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"}}]});
const entry=(sequence,observationId)=>({sequence,observationId,snapshot:snapshot()});
const check=observations=>verifySequencedReviewAuditChain({observations});
const denied=result=>expect(result).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 58 — sequenced audit chain",()=>{
 it("accepts sequential observations even when snapshots are identical",()=>{
  const result=check([entry(10,"a"),entry(11,"b"),entry(12,"c")]);
  expect(result.state).toBe("chain_observed");
  expect(result.findings).toEqual([]);
  denied(result);
 });
 it("detects missing sequence positions",()=>{
  const result=check([entry(1,"a"),entry(3,"b")]);
  expect(result.state).toBe("chain_blocked");
  expect(result.findings).toContain("SEQUENCE_GAP_OR_REORDER");
  denied(result);
 });
 it("detects reversed sequence positions",()=>{
  const result=check([entry(5,"a"),entry(4,"b")]);
  expect(result.findings).toContain("SEQUENCE_GAP_OR_REORDER");
  denied(result);
 });
 it("detects repeated observation identifiers",()=>{
  const result=check([entry(1,"same"),entry(2,"same")]);
  expect(result.findings).toContain("OBSERVATION_REPLAYED");
  denied(result);
 });
 it("blocks malformed metadata without leaking identifiers",()=>{
  const result=check([entry(1,"private"),entry(-1,"other")]);
  expect(result.state).toBe("chain_blocked");
  expect(result.findings).toContain("OBSERVATION_UNVERIFIED");
  expect(JSON.stringify(result)).not.toContain("private");
  denied(result);
 });
 it("rejects excessive observations and invalid limits",()=>{
  expect(()=>check(Array.from({length:17},(_,i)=>entry(i,"id"+i)))).toThrow();
  expect(()=>verifySequencedReviewAuditChain({
   observations:[entry(1,"a"),entry(2,"b")],maxObservations:33})).toThrow();
 });
});

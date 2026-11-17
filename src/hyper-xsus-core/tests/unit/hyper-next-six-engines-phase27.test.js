import {describe,it,expect} from "vitest";
import {createReviewTrustBoundary} from "../../next-engines/orchestration/review-trust-boundary.js";
const req=()=>({contractVersion:"1.0.0",requestId:"boundary-27",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-27",authorizationRef:"policy:test"}});
describe("Hyper six engines phase 27 — trust boundaries",()=>{
 it("isolates caller-owned mutable input and preserves review-only response",()=>{
  const boundary=createReviewTrustBoundary();
  const input=req();
  const isolated=boundary.isolate(input);
  expect(isolated).toEqual(input);
  expect(isolated).not.toBe(input);
  expect(isolated.payload).not.toBe(input.payload);
  input.context.traceId="changed";
  expect(isolated.context.traceId).toBe("trace-27");
  expect(boundary.coordinate(req()).result).toMatchObject({authorizedForExecution:false,sideEffects:false});
 });
 it("rejects unknown engine routing",()=>{
  const input=req();input.payload.inputs.unknown={};
  expect(()=>createReviewTrustBoundary().coordinate(input)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("rejects prototype pollution keys at any nesting level",()=>{
  const input=req();input.payload.inputs.truth=JSON.parse('{"__proto__":{"admin":true}}');
  expect(()=>createReviewTrustBoundary().coordinate(input)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("rejects getters rather than executing them",()=>{
  const input=req();
  Object.defineProperty(input.context,"secret",{enumerable:true,get(){throw Error("GETTER_EXECUTED");}});
  expect(()=>createReviewTrustBoundary().isolate(input)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("rejects cyclic references and unsupported values",()=>{
  const input=req();input.payload.loop=input;
  expect(()=>createReviewTrustBoundary().isolate(input)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
  const other=req();other.payload.value=()=>{};
  expect(()=>createReviewTrustBoundary().isolate(other)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("rejects excessive bytes, depth and node counts",()=>{
  const input=req();input.payload.extra="x".repeat(1000);
  expect(()=>createReviewTrustBoundary({maxBytes:100}).isolate(input)).toThrowError(expect.objectContaining({code:"REQUEST_TOO_LARGE"}));
  const deep=req();deep.payload.inputs.truth={claim:"nested"};
  expect(()=>createReviewTrustBoundary({maxDepth:2}).isolate(deep)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
  expect(()=>createReviewTrustBoundary({maxNodes:3}).isolate(req())).toThrow();
 });
 it("rejects invalid boundary configuration",()=>{
  for(const config of [{maxBytes:0},{maxDepth:0},{maxNodes:0},{maxNodes:1.5}])
   expect(()=>createReviewTrustBoundary(config)).toThrow();
 });
});

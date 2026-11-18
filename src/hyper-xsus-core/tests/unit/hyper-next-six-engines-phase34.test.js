import {describe,it,expect} from "vitest";
import {Buffer} from "node:buffer";
import {createReviewTrustBoundary} from "../../next-engines/orchestration/review-trust-boundary.js";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
const req=()=>({contractVersion:"1.0.0",requestId:"phase34",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace34",authorizationRef:"policy:test"}});
describe("Hyper phase 34 — bounded trust traversal",()=>{
 it("accepts input exactly at its serialized UTF-8 byte limit",()=>{
  const input=req();input.payload.extra="é😊";
  const bytes=Buffer.byteLength(JSON.stringify(input),"utf8");
  expect(createReviewTrustBoundary({maxBytes:bytes}).isolate(input).payload.extra).toBe("é😊");
  expect(()=>createReviewTrustBoundary({maxBytes:bytes-1}).isolate(input))
   .toThrowError(expect.objectContaining({code:"REQUEST_TOO_LARGE"}));
 });
 it("charges escaped characters by their serialized byte length",()=>{
  const input=req();input.payload.extra="\n\t\"\\";
  const bytes=Buffer.byteLength(JSON.stringify(input),"utf8");
  expect(()=>createReviewTrustBoundary({maxBytes:bytes-1}).isolate(input))
   .toThrowError(expect.objectContaining({code:"REQUEST_TOO_LARGE"}));
 });
 it("rejects excessive string bytes without touching subsequent getters",()=>{
  const input=req();input.payload.extra="x".repeat(10000);
  let invoked=0;
  Object.defineProperty(input.payload,"later",{enumerable:true,get(){invoked++;return "secret";}});
  expect(()=>createReviewTrustBoundary({maxBytes:256}).isolate(input))
   .toThrowError(expect.objectContaining({code:"REQUEST_TOO_LARGE"}));
  expect(invoked).toBe(0);
 });
 it("rejects sparse arrays before they are copied",()=>{
  const input=req();input.payload.extra=new Array(500);
  expect(()=>createReviewTrustBoundary().isolate(input))
   .toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("rejects arrays with non-index properties",()=>{
  const input=req();input.payload.extra=[1];input.payload.extra.hidden="value";
  expect(()=>createReviewTrustBoundary().isolate(input))
   .toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("enforces node budget for deeply nested objects",()=>{
  const input=req();input.payload.extra={a:{b:{c:1}}};
  expect(()=>createReviewTrustBoundary({maxNodes:3}).isolate(input))
   .toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("control plane rejects oversized input without persistence",async()=>{
  const input=req();input.payload.extra="x".repeat(10000);
  let saves=0;
  await expect(createReviewControlPlane({maxRequestBytes:256}).run(input,{
   save:async()=>{saves++;},load:async()=>null
  })).rejects.toMatchObject({code:"REQUEST_TOO_LARGE"});
  expect(saves).toBe(0);
 });
});

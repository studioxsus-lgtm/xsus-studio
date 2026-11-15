import { describe, expect, it, vi } from "vitest";
import { verifyXsusHyperEvidence } from "../../platform/xsus-app/xsus-hyper-evidence-client.js";

const accessToken="valid_supabase_test_token_123456";
const observationId="integration_123";
function fetchResult(body) {
 return vi.fn(async()=>({ok:true,status:200,json:async()=>body}));
}
describe("XSUS App Hyper evidence response binding",()=>{
 it("accepts a verified response bound to the requested observation",async()=>{
  const fetchImpl=fetchResult({ok:true,verified:true,observationId});
  await expect(verifyXsusHyperEvidence({observationId,accessToken,fetchImpl}))
   .resolves.toMatchObject({ok:true,verified:true,observationId});
 });
 it("rejects a verified response for a different observation",async()=>{
  const fetchImpl=fetchResult({ok:true,verified:true,observationId:"other_id"});
  await expect(verifyXsusHyperEvidence({observationId,accessToken,fetchImpl}))
   .rejects.toThrow("Hyper evidence verification ID mismatch.");
 });
 it("rejects an explicit null observation ID",async()=>{
  const fetchImpl=fetchResult({ok:true,verified:true,observationId:null});
  await expect(verifyXsusHyperEvidence({observationId,accessToken,fetchImpl}))
   .rejects.toThrow("Hyper evidence verification ID mismatch.");
 });
 it("rejects unverified results",async()=>{
  const fetchImpl=fetchResult({ok:true,verified:false,observationId});
  await expect(verifyXsusHyperEvidence({observationId,accessToken,fetchImpl}))
   .rejects.toThrow("Hyper evidence verification was not confirmed.");
 });
});
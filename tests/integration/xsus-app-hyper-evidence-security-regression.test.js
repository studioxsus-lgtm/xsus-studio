import {describe,it,expect,vi} from "vitest";
import {verifyXsusHyperEvidence} from "../../platform/xsus-app/xsus-hyper-evidence-client.js";

const token="valid_supabase_test_token_123456";
const id="integration_123";
const invoke=(overrides={})=>{
 const fetchImpl=vi.fn(async()=>({ok:true,status:200,json:async()=>({ok:true,verified:true,observationId:id})}));
 return {fetchImpl,run:()=>verifyXsusHyperEvidence({observationId:id,accessToken:token,fetchImpl,...overrides})};
};
describe("XSUS App Hyper evidence security regression",()=>{
 it.each(["", "../other", "with space", "x".repeat(129)])("blocks invalid observation IDs before network: %s",async observationId=>{
  const {fetchImpl,run}=invoke({observationId});
  await expect(run()).rejects.toThrow("Invalid observation ID.");
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("blocks invalid tokens before network",async()=>{
  const {fetchImpl,run}=invoke({accessToken:"invalid"});
  await expect(run()).rejects.toThrow("A valid Supabase access token is required.");
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("blocks unauthorized alternate endpoints before network",async()=>{
  const {fetchImpl,run}=invoke({endpoint:"https://attacker.example/api/xsus-app/hyper/evidence/verify"});
  await expect(run()).rejects.toThrow("Only HTTPS Render Hyper verification endpoints are allowed.");
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it.each([401,403])("rejects authentication/ownership failure %s",async status=>{
  const {run}=invoke({fetchImpl:vi.fn(async()=>({ok:false,status,json:async()=>({ok:false})}))});
  await expect(run()).rejects.toThrow("Hyper verification authorization failed.");
 });
 it("does not accept a false verified flag",async()=>{
  const {run}=invoke({fetchImpl:vi.fn(async()=>({ok:true,status:200,json:async()=>({ok:true,verified:false,observationId:id})}))});
  await expect(run()).rejects.toThrow("Hyper evidence verification was not confirmed.");
 });
 it("never sends credentials as cookies",async()=>{
  const {run,fetchImpl}=invoke();
  await run();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [endpoint,options]=fetchImpl.mock.calls[0];
  expect(endpoint).toBe("/api/xsus-app/hyper/evidence/verify");
  expect(options.credentials).toBe("omit");
  expect(options.redirect).toBe("error");
  expect(options.cache).toBe("no-store");
  expect(JSON.parse(options.body)).toEqual({action:"evidence.verify",observationId:id});
 });
});
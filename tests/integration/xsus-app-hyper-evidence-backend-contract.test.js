import {describe,it,expect,vi} from "vitest";
import {verifyXsusHyperEvidence} from "../../platform/xsus-app/xsus-hyper-evidence-client.js";

const observationId="integration_489768fca1404ce498c10846198a49be";
const accessToken="test_supabase_access_token_1234567890";
const endpoint="https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify";
const mockResponse=(status,body)=>vi.fn(async()=>({
 ok:status>=200&&status<300,
 status,
 json:async()=>body
}));
const request=(fetchImpl,extra={})=>verifyXsusHyperEvidence({
 observationId,accessToken,endpoint,fetchImpl,...extra
});

describe("XSUS App → Render Hyper evidence backend contract (mocked, no network)",()=>{
 it("sends an authenticated read-only verification request to the approved endpoint",async()=>{
  const fetchImpl=mockResponse(200,{ok:true,verified:true,observationId});
  await expect(request(fetchImpl)).resolves.toMatchObject({verified:true,observationId});
  const [url,init]=fetchImpl.mock.calls[0];
  expect(url).toBe(endpoint);
  expect(init.method).toBe("POST");
  expect(init.headers.Authorization).toBe(`Bearer ${accessToken}`);
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(init.body)).toEqual({action:"evidence.verify",observationId});
  expect(init.credentials).toBe("omit");
  expect(init.cache).toBe("no-store");
  expect(init.redirect).toBe("error");
 });
 it.each([
  [401,"Hyper verification authorization failed."],
  [403,"Hyper verification authorization failed."],
  [404,"Hyper evidence was not found."],
  [429,"Hyper verification rate limit reached."],
  [503,"Hyper verification is not enabled or unavailable."]
 ])("fails closed on backend HTTP %s",async(status,message)=>{
  await expect(request(mockResponse(status,{ok:false,code:"REJECTED"}))).rejects.toThrow(message);
 });
 it("rejects a backend success response that is not verified",async()=>{
  await expect(request(mockResponse(200,{ok:true,verified:false,observationId})))
   .rejects.toThrow("Hyper evidence verification was not confirmed.");
 });
 it("rejects mismatched evidence returned by the backend",async()=>{
  await expect(request(mockResponse(200,{ok:true,verified:true,observationId:"another"})))
   .rejects.toThrow("Hyper evidence verification ID mismatch.");
 });
 it("propagates abort signals to the network transport",async()=>{
  const controller=new AbortController();
  const fetchImpl=mockResponse(200,{ok:true,verified:true,observationId});
  await request(fetchImpl,{signal:controller.signal});
  expect(fetchImpl.mock.calls[0][1].signal).toBe(controller.signal);
 });
 it("does not accept a redirect as verified evidence",async()=>{
  await expect(request(mockResponse(302,{ok:true,verified:true,observationId})))
   .rejects.toThrow("Hyper verification request failed.");
 });
});

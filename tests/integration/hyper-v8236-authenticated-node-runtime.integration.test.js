import { describe, it, expect, vi } from "vitest";
import { Readable } from "node:stream";
import { createHyperNodeRuntimeRoute } from "../../src/platform/xsus-app/hyper-v8235-node-runtime-route.js";
import { createHyperAuthenticatedApiAdapter } from "../../src/platform/xsus-app/hyper-v8232-authenticated-api-adapter.js";
import { createHyperAppBackendHandler } from "../../src/platform/xsus-app/hyper-v8231-backend-handler.js";
import { createHyperAppIntegrationBridge } from "../../src/platform/xsus-app/hyper-v8230-app-integration-bridge.js";

const TOKEN = "valid-test-token-1234567890";
const USER = "11111111-1111-4111-8111-111111111111";
const OBS = "integration-test-evidence";
function setup({enabled=true,owner=true,verified=true}={}) {
  const readVerified = vi.fn(async () => ({verified:true}));
  const verifyBearerToken = vi.fn(async () => verified ? {verified:true,userId:USER} : {verified:false});
  const authorizeUser = vi.fn(async () => owner);
  const storage = {readVerified,store:vi.fn()};
  const bridge = createHyperAppIntegrationBridge({
    storage,enabled:true,
    authorize:(ctx,action)=>ctx?.verified===true && ctx?.source==="server-verified-principal" && action==="evidence.verify"
  });
  const handler = createHyperAppBackendHandler({bridge,authorizeUser,enabled:true});
  const composition = createHyperAuthenticatedApiAdapter({backendHandler:handler,verifyBearerToken,enabled:true});
  const route = createHyperNodeRuntimeRoute({composition,enabled});
  return {route,readVerified,verifyBearerToken,authorizeUser,storage};
}
async function invoke(route,{body={action:"evidence.verify",observationId:OBS},token=TOKEN,method="POST",headers={}}={}) {
  const raw=typeof body==="string"?body:JSON.stringify(body);
  const req=Readable.from([Buffer.from(raw)]);
  req.method=method;
  req.headers={"content-type":"application/json",authorization:token?"Bearer "+token:undefined,...headers};
  const res={writeHead:vi.fn(),end:vi.fn()};
  await route.handle(req,res);
  return {status:res.writeHead.mock.calls[0][0],body:JSON.parse(res.end.mock.calls[0][0])};
}
describe("Hyper v8.2.36 authenticated Node runtime integration (mocked; no live writes)",()=>{
  it("fails closed when route is disabled",async()=>{
    const x=setup({enabled:false}); const r=await invoke(x.route);
    expect(r.status).toBe(503);expect(x.verifyBearerToken).not.toHaveBeenCalled();
  });
  it("requires bearer authentication",async()=>{
    const x=setup();const r=await invoke(x.route,{token:null});
    expect(r.status).toBe(401);expect(x.readVerified).not.toHaveBeenCalled();
  });
  it("rejects invalid provider identity",async()=>{
    const x=setup({verified:false});const r=await invoke(x.route);
    expect(r.status).toBe(401);expect(x.authorizeUser).not.toHaveBeenCalled();
  });
  it("rejects evidence belonging to another user",async()=>{
    const x=setup({owner:false});const r=await invoke(x.route);
    expect(r.status).toBe(403);expect(x.readVerified).not.toHaveBeenCalled();
  });
  it("forbids client evidence.store requests",async()=>{
    const x=setup();const r=await invoke(x.route,{body:{action:"evidence.store",observationId:OBS}});
    expect(r.status).toBe(400);expect(x.storage.store).not.toHaveBeenCalled();
  });
  it("verifies owned evidence without returning secret or enabling production",async()=>{
    const x=setup();const r=await invoke(x.route);
    expect(r.status).toBe(200);expect(r.body).toMatchObject({ok:true,verified:true,productionEligible:false});
    expect(x.authorizeUser).toHaveBeenCalledWith({userId:USER,action:"evidence.verify",observationId:OBS});
    expect(x.readVerified).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(r.body)).not.toContain(TOKEN);
  });
  it("rejects oversized requests before authentication",async()=>{
    const x=setup();const r=await invoke(x.route,{body:"x".repeat(2049)});
    expect(r.status).toBe(413);expect(x.verifyBearerToken).not.toHaveBeenCalled();
  });
  it("rejects non-POST requests",async()=>{
    const x=setup();const r=await invoke(x.route,{method:"GET"});
    expect(r.status).toBe(405);expect(x.verifyBearerToken).not.toHaveBeenCalled();
  });
});

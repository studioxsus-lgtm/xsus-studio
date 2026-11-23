import {describe,it,expect,vi} from "vitest";
import {createBuildHttpHandler} from "../../src/xsus-app-build-engine/integration/build-http-handler.js";
const userId="11111111-1111-4111-8111-111111111111",projectId="22222222-2222-4222-8222-222222222222";
const body={projectId,executionId:"execution-0001",operationId:"operation-0001",prompt:"Build a notes app"};
function setup(){const authenticate=vi.fn(async()=>({userId})),authorizeProject=vi.fn(async()=>true),engine={build:vi.fn(async()=>({status:"succeeded"}))};return {api:createBuildHttpHandler({authenticate,authorizeProject,engine}),authenticate,authorizeProject,engine};}
describe("XSUS phase 73 server build HTTP contract",()=>{
 it("requires trusted dependencies",()=>expect(()=>createBuildHttpHandler()).toThrow("dependencies"));
 it("rejects non-POST requests",async()=>expect((await setup().api.handle({method:"GET"})).status).toBe(405));
 it("rejects missing session",async()=>{const x=setup();x.authenticate.mockResolvedValue(null);expect((await x.api.handle({method:"POST",body})).status).toBe(401);expect(x.engine.build).not.toHaveBeenCalled();});
 it("rejects invalid body",async()=>expect((await setup().api.handle({method:"POST",body:{...body,prompt:""}})).status).toBe(400));
 it("rejects owner impersonation field",async()=>expect((await setup().api.handle({method:"POST",body:{...body,ownerId:userId}})).status).toBe(400));
 it("rejects project access denial",async()=>{const x=setup();x.authorizeProject.mockResolvedValue(false);expect((await x.api.handle({method:"POST",body})).status).toBe(403);expect(x.engine.build).not.toHaveBeenCalled();});
 it("derives owner from authenticated principal",async()=>{const x=setup();await x.api.handle({method:"POST",body});expect(x.engine.build).toHaveBeenCalledWith(expect.objectContaining({ownerId:userId,projectId}));});
 it("returns sanitized result metadata",async()=>{const x=setup();const r=await x.api.handle({method:"POST",body});expect(r.status).toBe(200);expect(JSON.parse(r.body)).toMatchObject({status:"succeeded"});expect(r.body).not.toContain("manifest");});
 it("does not leak runtime errors",async()=>{const x=setup();x.engine.build.mockRejectedValue(new Error("secret host path"));const r=await x.api.handle({method:"POST",body});expect(r.status).toBe(503);expect(r.body).not.toContain("secret");});
 it("does not cache build responses",async()=>expect((await setup().api.handle({method:"POST",body})).headers["cache-control"]).toBe("no-store"));
 it("rejects cancelled requests",async()=>{const c=new AbortController();c.abort();expect((await setup().api.handle({method:"POST",body,signal:c.signal})).status).toBe(499);});
 it("rejects malformed execution identity",async()=>expect((await setup().api.handle({method:"POST",body:{...body,executionId:"../bad"}})).status).toBe(400));
});

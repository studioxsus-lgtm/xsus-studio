import {describe,it,expect,vi} from "vitest";
import {Readable} from "node:stream";
import {createBuildNodeAdapter} from "../../services/src/deployment/build-node-adapter.js";
const userId="11111111-1111-4111-8111-111111111111",projectId="22222222-2222-4222-8222-222222222222";
const payload={projectId,executionId:"execution-0001",operationId:"operation-0001",prompt:"Notes app"};
function setup(){const engine={build:vi.fn(async()=>({status:"succeeded"}))},authenticate=vi.fn(async()=>({userId})),authorizeProject=vi.fn(async()=>true);const handle=createBuildNodeAdapter({engine,authenticate,authorizeProject});async function send(method="POST",body=payload){const req=Readable.from([JSON.stringify(body)]);req.method=method;req.headers={};const res={headersSent:false,writableEnded:false,writeHead:vi.fn(function(status,headers){this.status=status;this.headers=headers;this.headersSent=true;}),end:vi.fn(function(value){this.body=JSON.parse(value);this.writableEnded=true;})};await handle(req,res);return res;}return {engine,authenticate,authorizeProject,send};}
describe("XSUS Render build Node route adapter",()=>{
 it("returns authenticated build metadata",async()=>{const x=setup(),r=await x.send();expect(r.status).toBe(200);expect(r.body.status).toBe("succeeded");});
 it("rejects wrong method",async()=>expect((await setup().send("GET")).status).toBe(405));
 it("rejects owner impersonation",async()=>expect((await setup().send("POST",{...payload,ownerId:userId})).status).toBe(400));
 it("does not expose engine errors",async()=>{const x=setup();x.engine.build.mockRejectedValue(new Error("private"));const r=await x.send();expect(r.status).toBe(503);expect(JSON.stringify(r.body)).not.toContain("private");});
 it("rejects unauthenticated users",async()=>{const x=setup();x.authenticate.mockResolvedValue(null);expect((await x.send()).status).toBe(401);});
 it("does not cache response",async()=>expect((await setup().send()).headers["cache-control"]).toBe("no-store"));
});

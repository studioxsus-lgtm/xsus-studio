import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {createAndroidWorkerRoute} from "../../services/src/build-worker/android-worker-route.js";
const token="x".repeat(40);
const body={applicationId:"com.xsus.tasks",displayName:"Tasks",minSdk:26,theme:"system",primarySeed:"#2563EB"};
function fixture(payload=body,authorization="Bearer "+token){
 const bytes=Buffer.from("504b0304","hex");
 const compiler=vi.fn(async()=>({kind:"apk",variant:"debug",bytes,size:4,sha256:createHash("sha256").update(bytes).digest("hex")}));
 const route=createAndroidWorkerRoute({enabled:true,token,gradleExecutable:"/usr/bin/gradle",compiler});
 const req={method:"POST",headers:{authorization,"content-type":"application/json"},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(payload));}};
 const res={writeHead:vi.fn(),end:vi.fn(),destroy:vi.fn()};
 return {route,req,res,compiler,bytes};
}
describe("Android worker API",()=>{
 it("disabled by default",()=>expect(createAndroidWorkerRoute()).toBeNull());
 it("requires absolute Gradle path",()=>expect(()=>createAndroidWorkerRoute({enabled:true,token,gradleExecutable:"gradle"})).toThrow());
 it("returns binary pending verification",async()=>{const f=fixture();await f.route(f.req,f.res);expect(f.res.writeHead).toHaveBeenCalledWith(200,expect.objectContaining({"x-xsus-artifact-status":"compiled_pending_verification"}));expect(f.res.end).toHaveBeenCalledWith(f.bytes)});
 it("rejects unauthorized callers",async()=>{const f=fixture(body,"bad");await f.route(f.req,f.res);expect(f.res.writeHead).toHaveBeenCalledWith(401);expect(f.compiler).not.toHaveBeenCalled()});
 it("rejects arbitrary commands",async()=>{const f=fixture({...body,command:"test"});await f.route(f.req,f.res);expect(f.res.writeHead).toHaveBeenCalledWith(400);expect(f.compiler).not.toHaveBeenCalled()});
 it("rejects corrupted artifact",async()=>{const f=fixture();f.compiler.mockResolvedValue({});await f.route(f.req,f.res);expect(f.res.writeHead).toHaveBeenCalledWith(503)});
});

import {describe,it,expect,vi} from "vitest";
import {createSecureHttpTransport} from "../../src/xsus-app-build-engine/sandbox/secure-http-transport.js";
const origin="https://sandbox.example.test";
const credential="server-only-token-12345";
const response=(data={success:true,diagnostics:[]})=>({ok:true,status:200,headers:{get:key=>key==="content-type"?"application/json":null},body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify(data)));c.close();}})});
const setup=(options={})=>createSecureHttpTransport({allowedOrigin:origin,getAccessToken:async()=>credential,fetchImpl:async()=>response(),...options});
const args={endpoint:origin+"/v1/execute",method:"POST",body:{executionId:"execution-0001"}};
describe("XSUS phase 27 secure HTTP transport",()=>{
  it("requires injected transport and credentials",()=>expect(()=>createSecureHttpTransport({allowedOrigin:origin})).toThrow("fetch"));
  it("rejects insecure origin",()=>expect(()=>setup({allowedOrigin:"http://sandbox.example.test"})).toThrow("HTTPS"));
  it("rejects cross-origin request before network",async()=>{const fetchImpl=vi.fn();await expect(setup({fetchImpl})({...args,endpoint:"https://other.example.test/v1/execute"})).rejects.toThrow("origin");expect(fetchImpl).not.toHaveBeenCalled();});
  it("requires POST",async()=>await expect(setup()({...args,method:"GET"})).rejects.toThrow("request"));
  it("sends authenticated requests with redirects disabled",async()=>{const fetchImpl=vi.fn(async()=>response());await setup({fetchImpl})(args);expect(fetchImpl.mock.calls[0][1]).toMatchObject({redirect:"error",credentials:"omit",cache:"no-store",headers:{authorization:"Bearer "+credential}});});
  it("parses bounded JSON response",async()=>expect(await setup()(args)).toMatchObject({success:true,diagnostics:[]}));
  it("rejects non-JSON responses",async()=>{const fetchImpl=async()=>({...response(),headers:{get:()=> "text/html"}});await expect(setup({fetchImpl})(args)).rejects.toThrow("content type");});
  it("rejects oversized streaming responses",async()=>{const fetchImpl=async()=>({ok:true,status:200,headers:{get:key=>key==="content-type"?"application/json":null},body:new ReadableStream({start(c){c.enqueue(new Uint8Array(65537));c.close();}})});await expect(setup({fetchImpl})(args)).rejects.toThrow("size limit");});
  it("does not call fetch for cancelled requests",async()=>{const fetchImpl=vi.fn();await expect(setup({fetchImpl})({...args,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(fetchImpl).not.toHaveBeenCalled();});
  it("rejects invalid server credentials",async()=>await expect(setup({getAccessToken:async()=>"short"})(args)).rejects.toThrow("credential"));
});

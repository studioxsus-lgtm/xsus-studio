import {describe,it,expect,vi} from "vitest";
import {createHyperNodeRuntimeRoute} from "./hyper-v8235-node-runtime-route.js";
async function run({headers={},chunks=[],method="POST"}={}) {
  const handle=vi.fn(async ({rawBody})=>({status:200,body:{ok:true,rawBody}}));
  const route=createHyperNodeRuntimeRoute({composition:{handle},enabled:true});
  const req={headers,method,async *[Symbol.asyncIterator](){for(const chunk of chunks)yield chunk;}};
  const res={writeHead:vi.fn(),end:vi.fn()};
  await route.handle(req,res);
  return {status:res.writeHead.mock.calls[0][0],body:JSON.parse(res.end.mock.calls[0][0]),handle};
}
describe("Hyper v8.2.37 HTTP framing hardening",()=>{
  it.each(["-1","2.5","1e3"," 5","NaN","Infinity","01"])("rejects malformed content-length %s",async value=>{
    const r=await run({headers:{"content-length":value}});
    expect(r.status).toBe(400);
    expect(r.handle).not.toHaveBeenCalled();
  });
  it("rejects mismatched declared length",async()=>{
    const r=await run({headers:{"content-length":"10"},chunks:[Buffer.from("abc")]});
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("CONTENT_LENGTH_MISMATCH");
  });
  it("accepts exact declared length",async()=>{
    const r=await run({headers:{"content-length":"3"},chunks:[Buffer.from("abc")]});
    expect(r.status).toBe(200);
  });
  it("preserves UTF-8 split across chunks",async()=>{
    const bytes=Buffer.from("é");
    const r=await run({chunks:[bytes.subarray(0,1),bytes.subarray(1)]});
    expect(r.status).toBe(200);
    expect(r.body.rawBody).toBe("é");
  });
  it("counts raw bytes not decoded characters",async()=>{
    const r=await run({chunks:[Buffer.from("é".repeat(1025))]});
    expect(r.status).toBe(413);
  });
  it("rejects invalid response arrays",async()=>{
    const route=createHyperNodeRuntimeRoute({composition:{handle:async()=>({status:200,body:[]})},enabled:true});
    const res={writeHead:vi.fn(),end:vi.fn()};
    await route.handle({method:"POST",headers:{},async *[Symbol.asyncIterator](){}},res);
    expect(res.writeHead.mock.calls[0][0]).toBe(503);
  });
});

import {describe,it,expect,vi} from "vitest";
import {createHyperNodeRuntimeRoute as create} from "./hyper-v8235-node-runtime-route.js";
async function invoke(route,{method="POST",headers={},chunks=[]}={}) {
  const req={method,headers,async *[Symbol.asyncIterator](){for(const c of chunks)yield Buffer.from(c);}};
  const res={writeHead:vi.fn(),end:vi.fn()};
  await route.handle(req,res);
  return {status:res.writeHead.mock.calls[0][0],
    body:JSON.parse(res.end.mock.calls[0][0])};
}
describe("Hyper v8.2.35 Node runtime boundary",()=>{
  it("requires a composition",()=>expect(()=>create()).toThrow());
  it("starts disabled",async()=>{
    const handle=vi.fn();
    const r=await invoke(create({composition:{handle}}));
    expect(r.status).toBe(503);
    expect(handle).not.toHaveBeenCalled();
  });
  it("rejects GET",async()=>{
    const r=await invoke(create({composition:{handle:vi.fn()},enabled:true}),{method:"GET"});
    expect(r.status).toBe(405);
  });
  it("rejects oversized content-length",async()=>{
    const handle=vi.fn();
    const r=await invoke(create({composition:{handle},enabled:true}),{
      headers:{"content-length":"2049"}});
    expect(r.status).toBe(413);
    expect(handle).not.toHaveBeenCalled();
  });
  it("rejects oversized streamed bodies",async()=>{
    const handle=vi.fn();
    const r=await invoke(create({composition:{handle},enabled:true}),{
      chunks:["a".repeat(1100),"b".repeat(1100)]});
    expect(r.status).toBe(413);
    expect(handle).not.toHaveBeenCalled();
  });
  it("passes request through composition",async()=>{
    const handle=vi.fn(async()=>({status:200,body:{ok:true}}));
    const r=await invoke(create({composition:{handle},enabled:true}),{
      headers:{authorization:"Bearer test"},
      chunks:['{"action":"evidence.verify"}']});
    expect(r.status).toBe(200);
    expect(handle).toHaveBeenCalledWith({
      method:"POST",headers:{authorization:"Bearer test"},
      rawBody:'{"action":"evidence.verify"}'
    });
  });
  it("preserves multibyte UTF-8 split across network chunks",async()=>{
    const handle=vi.fn(async()=>({status:200,body:{ok:true}}));
    const payload=Buffer.from(JSON.stringify({message:"Përshëndetje 🌍"}),"utf8");
    const boundary=payload.indexOf(Buffer.from("🌍")[0])+1;
    const result=await invoke(create({composition:{handle},enabled:true}),{
      headers:{"content-length":String(payload.length)},
      chunks:[payload.subarray(0,boundary),payload.subarray(boundary)]
    });
    expect(result.status).toBe(200);
    expect(handle.mock.calls[0][0].rawBody).toBe(payload.toString("utf8"));
  });
  it("rejects malformed declared content length before calling composition",async()=>{
    const handle=vi.fn();
    const result=await invoke(create({composition:{handle},enabled:true}),{
      headers:{"content-length":"2oops"},chunks:["{}"]
    });
    expect(result.status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });
  it("rejects declared length different from actual body bytes",async()=>{
    const handle=vi.fn();
    const result=await invoke(create({composition:{handle},enabled:true}),{
      headers:{"content-length":"5"},chunks:["{}"]
    });
    expect(result.status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });
  it("rejects malformed composition responses without leaking details",async()=>{
    const handle=vi.fn(async()=>({status:200,body:["invalid"]}));
    const result=await invoke(create({composition:{handle},enabled:true}));
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ok:false,code:"RUNTIME_UNAVAILABLE"});
  });
  it("sanitizes composition exceptions",async()=>{
    const route=create({composition:{handle:async()=>{throw Error("secret");}},enabled:true});
    const r=await invoke(route);
    expect(r.status).toBe(503);
    expect(JSON.stringify(r)).not.toContain("secret");
  });
});

import {describe,it,expect,vi} from "vitest";
import {createCoreTransport} from "../../services/src/build-worker/android-core-transport.js";
const config={endpoint:"https://core.example.com/internal/review",token:"x".repeat(40)};
const json=(v)=>new Response(JSON.stringify(v),{headers:{"content-type":"application/json"}});
describe("Core transport",()=>{
 it("sends authenticated POST without redirects",async()=>{const fetchImpl=vi.fn(async()=>json({status:"accepted"}));expect(await createCoreTransport({...config,fetchImpl})({id:1})).toEqual({status:"accepted"});expect(fetchImpl.mock.calls[0][1]).toMatchObject({method:"POST",redirect:"error",headers:{Authorization:"Bearer "+config.token}})});
 it("rejects HTTP",()=>expect(()=>createCoreTransport({...config,endpoint:"http://core.example.com"})).toThrow());
 it("rejects weak credentials",()=>expect(()=>createCoreTransport({...config,token:"short"})).toThrow());
 it("rejects oversized request",async()=>await expect(createCoreTransport(config)({data:"x".repeat(262145)})).rejects.toThrow("size"));
 it("rejects service errors",async()=>await expect(createCoreTransport({...config,fetchImpl:async()=>new Response(null,{status:503})})({})).rejects.toThrow("503"));
 it("rejects non JSON",async()=>await expect(createCoreTransport({...config,fetchImpl:async()=>new Response("html")})({})).rejects.toThrow("type"));
 it("bounds response",async()=>await expect(createCoreTransport({...config,fetchImpl:async()=>json({data:"x".repeat(262145)})})({})).rejects.toThrow("too large"));
 it("rejects array responses",async()=>await expect(createCoreTransport({...config,fetchImpl:async()=>json([])})({})).rejects.toThrow("Invalid core response"));
});

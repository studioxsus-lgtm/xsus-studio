import {describe,it,expect,vi} from "vitest";
import {verifyXsusHyperEvidence} from "../../platform/xsus-app/xsus-hyper-evidence-client.js";
const token="header.payload.signature";
describe("XSUS App -> authenticated Hyper evidence backend",()=>{
  it("posts read-only verification to same-origin backend",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({ok:true,verified:true})}));
    const result=await verifyXsusHyperEvidence({observationId:"obs_001",accessToken:token,fetchImpl});
    expect(result.verified).toBe(true);
    const [url,options]=fetchImpl.mock.calls[0];
    expect(url).toBe("/api/xsus-app/hyper/evidence/verify");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
    expect(options.credentials).toBe("omit");
    expect(JSON.parse(options.body)).toEqual({action:"evidence.verify",observationId:"obs_001"});
  });
  it.each(["../api/chat","https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify","/api/chat"])
    ("rejects alternate endpoint %s",async(endpoint)=>{
      const fetchImpl=vi.fn();
      await expect(verifyXsusHyperEvidence({observationId:"obs",accessToken:token,endpoint,fetchImpl})).rejects.toThrow();
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  it.each(["","../other","x y","x".repeat(129)])
    ("rejects invalid observation IDs",async(observationId)=>{
      const fetchImpl=vi.fn();
      await expect(verifyXsusHyperEvidence({observationId,accessToken:token,fetchImpl})).rejects.toThrow();
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  it("does not call backend without a valid token",async()=>{
    const fetchImpl=vi.fn();
    await expect(verifyXsusHyperEvidence({observationId:"obs",accessToken:"bad",fetchImpl})).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("handles disabled route without claiming success",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:false,status:503,json:async()=>({code:"RUNTIME_DISABLED"})}));
    await expect(verifyXsusHyperEvidence({observationId:"obs",accessToken:token,fetchImpl})).rejects.toThrow(/not enabled/);
  });
  it("handles forbidden ownership",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:false,status:403,json:async()=>({})}));
    await expect(verifyXsusHyperEvidence({observationId:"obs",accessToken:token,fetchImpl})).rejects.toThrow(/authorization/);
  });
});

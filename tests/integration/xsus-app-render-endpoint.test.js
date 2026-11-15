import {describe,it,expect,vi} from "vitest";
import {requestXsusAI} from "../../platform/xsus-app/xsus-ai-backend-client.js";

describe("XSUS App -> Render API transport",()=>{
  it("posts to explicitly configured HTTPS Render /api/chat",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({answer:"Ready",version:"1.2.0",language:"en"})}));
    const result=await requestXsusAI({prompt:"Build an app",endpoint:"https://xsus-ai.onrender.com/api/chat",fetchImpl});
    expect(result.answer).toBe("Ready");
    expect(fetchImpl).toHaveBeenCalledWith("https://xsus-ai.onrender.com/api/chat",expect.objectContaining({
      method:"POST",credentials:"omit",redirect:"error"
    }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({query:"Build an app",language:"en"});
  });
  it.each([
    "http://xsus-ai.onrender.com/api/chat",
    "https://evil.example/api/chat",
    "https://xsus-ai.onrender.com/other",
    "https://xsus-ai.onrender.com/api/chat?token=x",
    "https://user:pass@xsus-ai.onrender.com/api/chat",
    "//xsus-ai.onrender.com/api/chat"
  ])("rejects unsafe endpoint %s",async(endpoint)=>{
    const fetchImpl=vi.fn();
    await expect(requestXsusAI({prompt:"Build",endpoint,fetchImpl})).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

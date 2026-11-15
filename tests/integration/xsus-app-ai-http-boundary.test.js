import {describe,it,expect,vi} from "vitest";
import {requestXsusAI} from "../../platform/xsus-app/xsus-ai-backend-client.js";
describe("XSUS App -> XSUS AI HTTP boundary",()=>{
  it("sends only query and language to the same-origin backend",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({answer:"Hello",version:"1.2.0",language:"en",source:"xsus-ai-core"})}));
    const result=await requestXsusAI({prompt:" Hello ",fetchImpl});
    expect(result.answer).toBe("Hello");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url,options]=fetchImpl.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("omit");
    expect(JSON.parse(options.body)).toEqual({query:"Hello",language:"en"});
  });
  it("rejects invalid input before network access",async()=>{
    const fetchImpl=vi.fn();
    await expect(requestXsusAI({prompt:" ",fetchImpl})).rejects.toThrow();
    await expect(requestXsusAI({prompt:"x".repeat(8001),fetchImpl})).rejects.toThrow();
    await expect(requestXsusAI({prompt:"Hi",language:"xx",fetchImpl})).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and alternate endpoints",async()=>{
    for(const endpoint of ["https://example.com/api/chat","//evil/api/chat","/api/private-chat","/api/chat?token=secret"]){
      await expect(requestXsusAI({prompt:"Hi",endpoint})).rejects.toThrow();
    }
  });
  it("fails closed for backend errors and malformed responses",async()=>{
    await expect(requestXsusAI({prompt:"Hi",fetchImpl:async()=>({ok:false})})).rejects.toThrow("unavailable");
    await expect(requestXsusAI({prompt:"Hi",fetchImpl:async()=>({ok:true,json:async()=>({answer:42})})})).rejects.toThrow("Invalid");
  });
});

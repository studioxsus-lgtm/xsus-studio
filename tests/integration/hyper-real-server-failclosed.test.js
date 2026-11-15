import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

async function unusedPort() {
  const socket=net.createServer();
  socket.listen(0,"127.0.0.1");
  await new Promise((resolve,reject)=>{socket.once("listening",resolve);socket.once("error",reject);});
  const port=socket.address().port;
  await new Promise(resolve=>socket.close(resolve));
  return port;
}
describe("XSUS real HTTP entrypoint — Hyper evidence fail-closed",()=>{
  it("serves health and rejects evidence requests with feature flag off",async()=>{
    const port=await unusedPort();
    const child=spawn(process.execPath,["server.js"],{
      cwd:process.cwd(),
      env:{
        ...process.env,PORT:String(port),
        XSUS_HYPER_EVIDENCE_ROUTE_ENABLED:"false",
        XSUS_HYPER_APP_ENABLED:"false",
        XSUS_PRIVATE_CHAT_ENABLED:"false",
        XSUS_HYPER_READINESS_ENABLED:"false"
      },
      stdio:"ignore"
    });
    const base="http://127.0.0.1:"+port;
    try{
      let ready=false;
      for(let i=0;i<100;i++){
        if(child.exitCode!==null) throw Error("Server terminated during boot");
        try{
          const response=await fetch(base+"/health",{signal:AbortSignal.timeout(500)});
          if(response.ok){ready=true;break;}
        }catch{}
        await sleep(100);
      }
      expect(ready).toBe(true);
      const response=await fetch(base+"/api/xsus-app/hyper/evidence/verify",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action:"evidence.verify",observationId:"obs_1"}),
        signal:AbortSignal.timeout(2000)
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ok:false,code:"RUNTIME_DISABLED"});
      expect(response.headers.get("cache-control")).toBe("no-store");
    }finally{
      child.kill("SIGTERM");
    }
  },20000);
});

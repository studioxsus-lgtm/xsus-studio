import {describe,it,expect,vi} from "vitest";
import {createBuildWorkerConnectivity} from "../../services/src/deployment/build-worker-connectivity.js";
import {createBuildWorkerServer} from "../../services/src/build-worker/standalone-worker.js";
import {once} from "node:events";
const sharedSecret="test-only-secret-with-32-characters-minimum";
describe("XSUS worker connectivity",()=>{
 it("rejects untrusted URL",()=>expect(()=>createBuildWorkerConnectivity({workerUrl:"http://localhost",sharedSecret})).toThrow());
 it("rejects missing secret",()=>expect(()=>createBuildWorkerConnectivity({workerUrl:"https://xsus-app-build-worker.onrender.com"})).toThrow());
 it("sends authenticated request",async()=>{const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({ok:true,service:"xsus-app-build-worker"})}));const c=createBuildWorkerConnectivity({workerUrl:"https://xsus-app-build-worker.onrender.com",sharedSecret,fetchImpl});expect(await c.check()).toEqual({connected:true,buildEnabled:false});expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe("Bearer "+sharedSecret);});
 it("rejects unexpected worker identity",async()=>{const c=createBuildWorkerConnectivity({workerUrl:"https://xsus-app-build-worker.onrender.com",sharedSecret,fetchImpl:async()=>({ok:true,json:async()=>({ok:true,service:"other"})})});expect((await c.check()).connected).toBe(false);});
 it("fails closed on network errors",async()=>{const c=createBuildWorkerConnectivity({workerUrl:"https://xsus-app-build-worker.onrender.com",sharedSecret,fetchImpl:async()=>{throw Error("offline")}});expect((await c.check()).connected).toBe(false);});
 it("rejects unauthenticated live local probe",async()=>{const server=createBuildWorkerServer({sharedSecret});server.listen(0,"127.0.0.1");await once(server,"listening");try{const response=await fetch("http://127.0.0.1:"+server.address().port+"/internal/connectivity",{method:"POST"});expect(response.status).toBe(401);}finally{await new Promise(resolve=>server.close(resolve));}});
 it("accepts authenticated local probe without enabling builds",async()=>{const server=createBuildWorkerServer({sharedSecret});server.listen(0,"127.0.0.1");await once(server,"listening");try{const response=await fetch("http://127.0.0.1:"+server.address().port+"/internal/connectivity",{method:"POST",headers:{authorization:"Bearer "+sharedSecret}});expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,buildEnabled:false});}finally{await new Promise(resolve=>server.close(resolve));}});
});

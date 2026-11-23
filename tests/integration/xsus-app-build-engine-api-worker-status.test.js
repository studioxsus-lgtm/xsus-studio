import {describe,it,expect} from "vitest";
import {once} from "node:events";
import {createStandaloneDeploymentServer} from "../../services/src/deployment/standalone-server.js";
async function probe(dependencies,route,authorization){
 const server=createStandaloneDeploymentServer(dependencies);
 server.listen(0,"127.0.0.1");await once(server,"listening");
 try{
  const res=await fetch("http://127.0.0.1:"+server.address().port+route,{headers:authorization?{authorization}:{}});
  return {status:res.status,body:await res.json()};
 }finally{await new Promise(resolve=>server.close(resolve));}
}
describe("XSUS API worker connectivity status",()=>{
 it("is disabled by default",async()=>expect((await probe({},"/internal/build-worker/status")).status).toBe(404));
 it("requires authorized server-side status token",async()=>expect((await probe({workerConnectivity:{check:async()=>({connected:true})},connectivityToken:"test-token"},"/internal/build-worker/status")).status).toBe(404));
 it("returns connected status only after trusted probe",async()=>{const r=await probe({workerConnectivity:{check:async()=>({connected:true,buildEnabled:false})},connectivityToken:"test-token"},"/internal/build-worker/status","Bearer test-token");expect(r).toMatchObject({status:200,body:{connected:true,buildEnabled:false}});});
 it("fails closed on worker outage",async()=>expect((await probe({workerConnectivity:{check:async()=>({connected:false})},connectivityToken:"test-token"},"/internal/build-worker/status","Bearer test-token")).status).toBe(503));
 it("does not disclose connectivity failures",async()=>expect((await probe({workerConnectivity:{check:async()=>{throw Error("secret")}},connectivityToken:"test-token"},"/internal/build-worker/status","Bearer test-token")).body).toEqual({connected:false}));
});

import http from "node:http";
import {timingSafeEqual} from "node:crypto";
import {pathToFileURL} from "node:url";
export const XSUS_BUILD_WORKER_VERSION="0.2.0";
function authenticated(header,secret){
 if(typeof secret!=="string"||secret.length<32||typeof header!=="string"||!header.startsWith("Bearer "))return false;
 const a=Buffer.from(header.slice(7)),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
}
/** Server-to-server connectivity check only. Never executes builds. */
export function createBuildWorkerServer({sharedSecret}={}){
 return http.createServer((req,res)=>{
  res.setHeader("content-type","application/json");
  res.setHeader("cache-control","no-store");
  res.setHeader("x-content-type-options","nosniff");
  const path=req.url?.split("?")[0];
  if(req.method==="GET"&&path==="/healthz"){
   res.writeHead(200);res.end(JSON.stringify({ok:true,service:"xsus-app-build-worker",buildEnabled:false}));return;
  }
  if(req.method==="POST"&&path==="/internal/connectivity"){
   if(!authenticated(req.headers.authorization,sharedSecret)){
    res.writeHead(401);res.end(JSON.stringify({error:"unauthorized"}));return;
   }
   res.writeHead(200);res.end(JSON.stringify({ok:true,service:"xsus-app-build-worker",buildEnabled:false}));return;
  }
  res.writeHead(503);res.end(JSON.stringify({error:"build_worker_not_configured"}));
 });
}
export function startBuildWorkerServer({env=process.env}={}){
 const port=Number(env.PORT??3002);
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw new TypeError("Invalid PORT");
 const server=createBuildWorkerServer({sharedSecret:env.XSUS_BUILD_WORKER_SHARED_SECRET});
 server.listen(port,"0.0.0.0");
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startBuildWorkerServer();

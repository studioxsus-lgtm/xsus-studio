import http from "node:http";
import {pathToFileURL} from "node:url";
export const XSUS_BUILD_WORKER_VERSION="0.1.0";
/** Fail-closed bootstrap: no unverified Docker or project execution. */
export function createBuildWorkerServer(){
 return http.createServer((req,res)=>{
  res.setHeader("content-type","application/json");
  res.setHeader("cache-control","no-store");
  res.setHeader("x-content-type-options","nosniff");
  if(req.method==="GET"&&req.url?.split("?")[0]==="/healthz"){
   res.writeHead(200);res.end(JSON.stringify({ok:true,service:"xsus-app-build-worker",buildEnabled:false}));return;
  }
  res.writeHead(503);res.end(JSON.stringify({error:"build_worker_not_configured"}));
 });
}
export function startBuildWorkerServer({env=process.env}={}){
 const port=Number(env.PORT??3002);
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw new TypeError("Invalid PORT");
 const server=createBuildWorkerServer();
 server.listen(port,"0.0.0.0");
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startBuildWorkerServer();

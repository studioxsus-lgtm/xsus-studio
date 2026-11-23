import http from "node:http";
import {timingSafeEqual} from "node:crypto";
import {pathToFileURL} from "node:url";
import {generateWorkerStaticPreview} from "./static-preview-build.js";
export const XSUS_BUILD_WORKER_VERSION="0.3.0";
function authenticated(header,secret){
 if(typeof secret!=="string"||secret.length<32||typeof header!=="string"||!header.startsWith("Bearer "))return false;
 const a=Buffer.from(header.slice(7)),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
}
/** Server-to-server connectivity check only. Never executes builds. */
export function createBuildWorkerServer({sharedSecret,previewEnabled=false}={}){
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
  if(req.method==="POST"&&path==="/internal/static-preview"){
   if(!authenticated(req.headers.authorization,sharedSecret)){
    res.writeHead(401);res.end(JSON.stringify({error:"unauthorized"}));return;
   }
   if(previewEnabled!==true){res.writeHead(503);res.end(JSON.stringify({error:"preview_disabled"}));return;}
   void (async()=>{
    try{
     const length=req.headers["content-length"];
     if(length!==undefined&&(!/^\d+$/.test(String(length))||Number(length)>2048)){res.writeHead(413);res.end(JSON.stringify({error:"payload_too_large"}));return;}
     const chunks=[];let size=0;
     for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413);res.end(JSON.stringify({error:"payload_too_large"}));return;}chunks.push(chunk);}
     let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{res.writeHead(400);res.end(JSON.stringify({error:"invalid_json"}));return;}
     if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>k!=="name"&&k!=="appSpec")){res.writeHead(400);res.end(JSON.stringify({error:"invalid_request"}));return;}
     let preview;try{preview=generateWorkerStaticPreview(body);}catch{res.writeHead(400);res.end(JSON.stringify({error:"invalid_request"}));return;}
     res.writeHead(200);res.end(JSON.stringify(preview));
    }catch{if(!res.writableEnded){res.writeHead(503);res.end(JSON.stringify({error:"preview_unavailable"}));}}
   })();return;
  }
  res.writeHead(503);res.end(JSON.stringify({error:"build_worker_not_configured"}));
 });
}
export function startBuildWorkerServer({env=process.env}={}){
 const port=Number(env.PORT??3002);
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw new TypeError("Invalid PORT");
 const server=createBuildWorkerServer({sharedSecret:env.XSUS_BUILD_WORKER_SHARED_SECRET,previewEnabled:env.XSUS_STATIC_PREVIEW_ENABLED==="true"});
 server.on("error",error=>{
  console.error("[xsus-worker-listener]",JSON.stringify({event:"error",code:error?.code??"unknown"}));
 });
 server.listen(port,"0.0.0.0",()=>{
  console.info("[xsus-worker-listener]",JSON.stringify({event:"listening",port:server.address()?.port,previewEnabled:env.XSUS_STATIC_PREVIEW_ENABLED==="true"}));
 });
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startBuildWorkerServer();

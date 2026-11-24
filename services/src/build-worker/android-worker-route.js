import {timingSafeEqual,createHash} from "node:crypto";
import {isAbsolute} from "node:path";
import {buildAndroidDebug} from "./android-build-worker.js";

export function createAndroidWorkerRoute({enabled=false,token,gradleExecutable,compiler=buildAndroidDebug}={}){
 if(!enabled)return null;
 if(typeof token!=="string"||!/^[A-Za-z0-9._~-]{32,256}$/.test(token)||typeof gradleExecutable!=="string"||!isAbsolute(gradleExecutable))throw Error("Invalid Android worker configuration");
 const expected=Buffer.from("Bearer "+token);let busy=false;
 return async function handle(req,res){
  const send=(status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));};
  if(req.method!=="POST")return send(405,{error:"method_not_allowed"});
  const actual=Buffer.from(req.headers.authorization??"");
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return send(401,{error:"unauthorized"});
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"]??""))return send(415,{error:"invalid_content_type"});
  if(busy)return send(429,{error:"worker_busy"});
  busy=true;
  try{
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>8192)return send(413,{error:"payload_too_large"});chunks.push(chunk);}
   let body;
   try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return send(400,{error:"invalid_json"});}
   if(!body||Object.keys(body).sort().join(",")!=="applicationId,displayName,minSdk,primarySeed,theme"||
      typeof body.applicationId!=="string"||typeof body.displayName!=="string"||!Number.isInteger(body.minSdk)||body.minSdk<23||body.minSdk>35||
      !["system","light","dark"].includes(body.theme)||!/^#[a-fA-F0-9]{6}$/.test(body.primarySeed??""))return send(400,{error:"invalid_request"});
   const artifact=await compiler({applicationId:body.applicationId,displayName:body.displayName},{minSdk:body.minSdk,theme:body.theme,primarySeed:body.primarySeed,navigation:"single_screen"},{gradleExecutable});
   if(artifact?.kind!=="apk"||artifact.variant!=="debug"||!Buffer.isBuffer(artifact.bytes)||artifact.bytes.length<4||artifact.bytes.length>128*1024*1024||artifact.bytes.subarray(0,4).toString("hex")!=="504b0304"||artifact.size!==artifact.bytes.length||artifact.sha256!==createHash("sha256").update(artifact.bytes).digest("hex"))throw Error("Invalid artifact");
   res.writeHead(200,{"content-type":"application/octet-stream","content-length":artifact.size,"x-xsus-sha256":artifact.sha256,"x-xsus-artifact-status":"compiled_pending_verification"});
   res.end(artifact.bytes);
  }catch{if(!res.headersSent)send(503,{error:"android_build_failed"});else res.destroy();}
  finally{busy=false;}
 };
}

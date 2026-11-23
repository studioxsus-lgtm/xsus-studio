import {createBuildHttpHandler} from "../../../src/xsus-app-build-engine/integration/build-http-handler.js";
export const BUILD_NODE_ADAPTER_VERSION="0.1.0";
const MAX_BYTES=8192;
/** Opt-in Node route: mounted only when a trusted build engine is injected. */
export function createBuildNodeAdapter(dependencies){
 const handler=createBuildHttpHandler(dependencies);
 return async function handleBuildNode(req,res){
  const reply=(status,body,headers={})=>{
   if(res.headersSent||res.writableEnded)return;
   res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers});
   res.end(JSON.stringify(body));
  };
  try{
   if(req.method!=="POST")return reply(405,{error:"method_not_allowed"},{allow:"POST"});
   const length=req.headers["content-length"];
   if(length!==undefined&&(!/^\d+$/.test(String(length))||Number(length)>MAX_BYTES))return reply(413,{error:"invalid_body_size"});
   const chunks=[];let size=0;
   for await(const chunk of req){
    size+=Buffer.byteLength(chunk);
    if(size>MAX_BYTES)return reply(413,{error:"invalid_body_size"});
    chunks.push(Buffer.from(chunk));
   }
   let body;
   try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return reply(400,{error:"invalid_json"});}
   const result=await handler.handle({method:req.method,headers:req.headers,body,signal:req.signal});
   return reply(result.status,JSON.parse(result.body),result.headers);
  }catch{return reply(503,{error:"build_unavailable"});}
 };
}

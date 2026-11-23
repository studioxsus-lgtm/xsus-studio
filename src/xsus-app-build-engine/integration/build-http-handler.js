export const BUILD_HTTP_HANDLER_VERSION="0.1.0";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
function reply(status,body){return Object.freeze({status,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});}
/** Transport-agnostic server endpoint; caller must enforce TLS, body-size and rate limits. */
export function createBuildHttpHandler({authenticate,authorizeProject,engine}={}){
 if(typeof authenticate!=="function"||typeof authorizeProject!=="function"||!engine||typeof engine.build!=="function")throw new TypeError("Trusted HTTP build dependencies required");
 return Object.freeze({
  async handle({method,headers={},body,signal}={}){
   if(method!=="POST")return reply(405,{error:"method_not_allowed"});
   const principal=await authenticate({headers});
   if(!principal||typeof principal.userId!=="string"||!UUID.test(principal.userId))return reply(401,{error:"unauthorized"});
   if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(key=>!["projectId","executionId","operationId","prompt"].includes(key))||!UUID.test(body.projectId??"")||!ID.test(body.executionId??"")||!ID.test(body.operationId??"")||typeof body.prompt!=="string"||!body.prompt.trim()||body.prompt.length>4000)return reply(400,{error:"invalid_request"});
   if(await authorizeProject({ownerId:principal.userId,projectId:body.projectId,action:"application.build"})!==true)return reply(403,{error:"forbidden"});
   if(signal?.aborted)return reply(499,{error:"cancelled"});
   try{
    const result=await engine.build({ownerId:principal.userId,projectId:body.projectId,executionId:body.executionId,operationId:body.operationId,prompt:body.prompt,signal});
    if(!result||!["succeeded","failed","uncertain"].includes(result.status))throw new Error("Invalid build outcome");
    return reply(200,{projectId:body.projectId,executionId:body.executionId,operationId:body.operationId,status:result.status});
   }catch(error){
    // Never leak host paths, SQL, runtime diagnostics or secrets over HTTP.
    return reply(503,{error:"build_unavailable"});
   }
  }
 });
}

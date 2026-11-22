import { handleDeploymentValidationHttp } from './deployment-http-handler.js';
import { handleProjectReviewHttp } from './project-review-http-handler.js';

// Explicitly mount on a trusted Node HTTP server; this module never starts a listener.
const MAX_BYTES=16*1024;
export function createDeploymentNodeHandler(dependencies) {
  return async function deploymentNodeHandler(req,res) {
    const reply=(status,body,headers={})=>{
      if (res.headersSent || res.writableEnded) return;
      res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers});
      res.end(JSON.stringify(body));
    };
    try {
      const path=req.url?.split('?')[0];
      if (path!=='/api/deployments/validate' && path!=='/api/projects/review')
        return reply(404,{error:'not_found',deployed:false});
      if (req.method!=='POST') return reply(405,{error:'method_not_allowed',deployed:false},{allow:'POST'});
      const length=Number(req.headers['content-length']);
      if (req.headers['content-length']!==undefined && (!Number.isSafeInteger(length)||length<0||length>MAX_BYTES))
        return reply(413,{error:'invalid_body_size',deployed:false});
      const chunks=[]; let bytes=0;
      for await (const chunk of req) {
        bytes+=Buffer.byteLength(chunk);
        if (bytes>MAX_BYTES) return reply(413,{error:'invalid_body_size',deployed:false});
        chunks.push(Buffer.from(chunk));
      }
      const input={method:req.method,headers:req.headers,body:Buffer.concat(chunks).toString('utf8')};
      const result=path==='/api/projects/review'
        ? await handleProjectReviewHttp(input,dependencies)
        : await handleDeploymentValidationHttp(input,dependencies);
      return reply(result.status,result.body,result.headers);
    } catch {
      return reply(503,{error:'validation_unavailable',deployed:false});
    }
  };
}

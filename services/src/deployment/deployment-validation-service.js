// Trusted server-side validation boundary. Does NOT deploy or call a provider.
// Caller must supply verified identity, project authorization, and trusted artifact lookup.
import { createHash } from 'node:crypto';

const NAMES=['index.html','styles.css','app.js'];
const TARGETS=new Set(['static-host','github-pages','render-static']);
const VERSION='1.0.0';
const MAX_ARTIFACT_BYTES=1024*1024;
const MAX_TOTAL_BYTES=2*1024*1024;
const deny=(reason)=>({contractVersion:VERSION,operation:'deployment.request',requestId:'',status:'denied',reason,deployed:false});
export async function validateDeploymentRequest(request, context={}) {
  if (!request || request.contractVersion!==VERSION || request.operation!=='deployment.request' ||
      request.requestedAction!=='validate-only' || !TARGETS.has(request.target) ||
      typeof request.projectId!=='string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(request.projectId) ||
      !Array.isArray(request.files) || request.files.length!==3 ||
      !NAMES.every(name=>request.files.filter(f=>f?.name===name).length===1))
    return deny('Invalid deployment validation request');
  // Never trust a user id supplied in the request body.
  if (typeof context.authenticate!=='function' || typeof context.authorizeProject!=='function' ||
      typeof context.loadTrustedFiles!=='function') return deny('Trusted backend dependencies unavailable');
  try {
    const identity=await context.authenticate();
    if (!identity || !await context.authorizeProject(identity,request.projectId,request.target))
      return deny('Project authorization denied');
    const trusted=await context.loadTrustedFiles(identity,request.projectId);
    if (!trusted || !NAMES.every(name=>typeof trusted[name]==='string'))
      return deny('Trusted build artifacts unavailable');
    let totalBytes=0;
    for (const name of NAMES) {
      const record=request.files.find(file=>file.name===name);
      const bytes=Buffer.from(trusted[name],'utf8');
      totalBytes+=bytes.length;
      if (bytes.length>MAX_ARTIFACT_BYTES || totalBytes>MAX_TOTAL_BYTES ||
          !Number.isSafeInteger(record.bytes) || record.bytes!==bytes.length ||
          typeof record.sha256!=='string' || !/^[a-f0-9]{64}$/.test(record.sha256) ||
          createHash('sha256').update(bytes).digest('hex')!==record.sha256)
        return deny('Trusted artifact integrity mismatch');
    }
    return {contractVersion:VERSION,operation:'deployment.request',requestId:'',
      status:'approved-for-review',reason:'Validated against authorized project artifacts; execution not permitted',deployed:false};
  } catch {
    return deny('Deployment validation unavailable');
  }
}

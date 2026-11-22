import {describe,it,expect} from 'vitest';
import {createDeploymentRequest,validateDeploymentResponse,offlineDeploymentDecision} from '../../assets/js/xsus-app/code-generation/deployment-backend-contract.js';
const plan={schemaVersion:2,status:'prepared-not-deployed',target:'github-pages',files:['index.html','styles.css','app.js'].map(name=>({name,bytes:12,sha256:'a'.repeat(64)}))};
describe('deployment backend contract',()=>{
 it('creates a validation-only request with no credentials',()=>{
   const req=createDeploymentRequest(plan,'project_1');
   expect(req.requestedAction).toBe('validate-only');
   expect(req).not.toHaveProperty('token');
 });
 it('rejects unknown targets',()=>expect(()=>createDeploymentRequest({...plan,target:'unknown'},'project_1')).toThrow());
 it('rejects forged or malformed checksums',()=>expect(()=>createDeploymentRequest({...plan,files:plan.files.map(f=>({...f,sha256:'invalid'}))},'project_1')).toThrow());
 it('rejects invalid project identifiers',()=>expect(()=>createDeploymentRequest(plan,'../../secret')).toThrow());
 it('fails closed when no backend exists',()=>expect(offlineDeploymentDecision().deployed).toBe(false));
 it('rejects responses claiming a deployment occurred',()=>expect(validateDeploymentResponse({contractVersion:'1.0.0',operation:'deployment.request',requestId:'x',status:'approved-for-review',reason:'ok',deployed:true}).ok).toBe(false));
});

import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {validateDeploymentRequest} from '../../services/src/deployment/deployment-validation-service.js';
const files={'index.html':'<html></html>','styles.css':'body{}','app.js':'console.log(1)'};
const request={contractVersion:'1.0.0',operation:'deployment.request',requestedAction:'validate-only',
 projectId:'project_1',target:'render-static',
 files:Object.entries(files).map(([name,body])=>({name,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex')}))};
const context={authenticate:async()=>({id:'verified-user'}),authorizeProject:async()=>true,loadTrustedFiles:async()=>files};
describe('server-side deployment validation',()=>{
 it('fails closed without trusted dependencies',async()=>{
   expect((await validateDeploymentRequest(request)).status).toBe('denied');
 });
 it('rejects unauthorized projects',async()=>{
   const result=await validateDeploymentRequest(request,{...context,authorizeProject:async()=>false});
   expect(result.status).toBe('denied');
 });
 it('rejects mismatched trusted files',async()=>{
   const result=await validateDeploymentRequest(request,{...context,loadTrustedFiles:async()=>({...files,'app.js':'tampered'})});
   expect(result.status).toBe('denied');
 });
 it('validates authorized artifacts without deploying',async()=>{
   const result=await validateDeploymentRequest(request,context);
   expect(result.status).toBe('approved-for-review');
   expect(result.deployed).toBe(false);
 });
 it('rejects requests for execution',async()=>{
   expect((await validateDeploymentRequest({...request,requestedAction:'deploy'},context)).status).toBe('denied');
 });
});

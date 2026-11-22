import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {createSupabaseDeploymentContext} from '../../services/src/deployment/supabase-project-authorization.js';
import {validateDeploymentRequest} from '../../services/src/deployment/deployment-validation-service.js';
const files={'index.html':'<html></html>','styles.css':'body{}','app.js':'console.log(1)'};
const request={contractVersion:'1.0.0',operation:'deployment.request',requestedAction:'validate-only',projectId:'project_1',target:'render-static',
 files:Object.entries(files).map(([name,content])=>({name,bytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex')}))};
function context({user='owner',owner='owner'}={}) {
 return createSupabaseDeploymentContext({
   authClient:{auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null})}},
   projectStore:{findOwnedProject:async({projectId,ownerId})=>ownerId===owner?{id:projectId,ownerId:owner}:null},
   artifactStore:{loadFiles:async()=>files},accessToken:'test-token'
 });
}
describe('Supabase deployment authorization adapter',()=>{
 it('accepts verified owner only for review',async()=>{
   const result=await validateDeploymentRequest(request,context());
   expect(result.status).toBe('approved-for-review');
   expect(result.deployed).toBe(false);
 });
 it('denies a different owner',async()=>{
   expect((await validateDeploymentRequest(request,context({user:'intruder'}))).status).toBe('denied');
 });
 it('denies missing verified user',async()=>{
   expect((await validateDeploymentRequest(request,context({user:null}))).status).toBe('denied');
 });
 it('requires all trusted dependencies',()=>{
   expect(()=>createSupabaseDeploymentContext({})).toThrow();
 });
 it('does not expose files without ownership',async()=>{
   const ctx=context({user:'intruder'});
   const identity=await ctx.authenticate();
   await expect(ctx.loadTrustedFiles(identity,'project_1')).rejects.toThrow();
 });
});

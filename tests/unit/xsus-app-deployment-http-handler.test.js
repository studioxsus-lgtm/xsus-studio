import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {handleDeploymentValidationHttp as handle} from '../../services/src/deployment/deployment-http-handler.js';
const origin='https://www.xsusstudio.com';
const files={'index.html':'<html></html>','styles.css':'body{}','app.js':'console.log(1)'};
const payload={contractVersion:'1.0.0',operation:'deployment.request',requestedAction:'validate-only',projectId:'project_1',target:'render-static',
 files:Object.entries(files).map(([name,content])=>({name,bytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex')}))};
const input={method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer test-token'},body:JSON.stringify(payload)};
const deps={allowedOrigins:[origin],authClient:{auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})}},
 projectStore:{findOwnedProject:async({projectId,ownerId})=>({id:projectId,ownerId})},
 artifactStore:{loadFiles:async()=>files}};
describe('deployment validation HTTP boundary',()=>{
 it('rejects methods other than POST',async()=>expect((await handle({...input,method:'GET'},deps)).status).toBe(405));
 it('rejects unapproved origins',async()=>expect((await handle({...input,headers:{...input.headers,origin:'https://evil.example'}},deps)).status).toBe(403));
 it('rejects missing bearer token',async()=>expect((await handle({...input,headers:{...input.headers,authorization:''}},deps)).status).toBe(401));
 it('rejects invalid JSON',async()=>expect((await handle({...input,body:'{'},deps)).status).toBe(400));
 it('rejects oversized requests',async()=>expect((await handle({...input,body:'x'.repeat(16385)},deps)).status).toBe(413));
 it('fails closed without dependencies',async()=>expect((await handle(input,{allowedOrigins:[origin]})).status).toBe(503));
 it('validates an authorized request without deployment',async()=>{
   const result=await handle(input,deps);
   expect(result.status).toBe(200);
   expect(result.body.status).toBe('approved-for-review');
   expect(result.body.deployed).toBe(false);
 });
});

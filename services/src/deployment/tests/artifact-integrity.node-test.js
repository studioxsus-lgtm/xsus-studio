import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateDeploymentRequest} from '../deployment-validation-service.js';
const projectId='11111111-1111-4111-8111-111111111111';
const original={'index.html':'<html></html>','styles.css':'body{}','app.js':'console.log(1)'};
function request(files) {
 return {contractVersion:'1.0.0',operation:'deployment.request',requestedAction:'validate-only',projectId,target:'static-host',
 files:Object.entries(files).map(([name,body])=>({name,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex')}))};
}
function context(files){return {authenticate:async()=>({id:'verified'}),authorizeProject:async()=>true,loadTrustedFiles:async()=>files};}
test('authorized trusted artifacts pass validation without deployment',async()=>{
 const result=await validateDeploymentRequest(request(original),context(original));
 assert.equal(result.status,'approved-for-review');
 assert.equal(result.deployed,false);
});
test('rejects artifact changed after client generated digest',async()=>{
 const result=await validateDeploymentRequest(request(original),context({...original,'app.js':'tampered'}));
 assert.equal(result.status,'denied');
 assert.equal(result.deployed,false);
});
test('rejects individually oversized trusted artifact despite matching digest',async()=>{
 const files={...original,'app.js':'a'.repeat(1024*1024+1)};
 const result=await validateDeploymentRequest(request(files),context(files));
 assert.equal(result.status,'denied');
});
test('rejects aggregate trusted artifacts larger than two MiB',async()=>{
 const files={'index.html':'a'.repeat(800000),'styles.css':'b'.repeat(800000),'app.js':'c'.repeat(800000)};
 const result=await validateDeploymentRequest(request(files),context(files));
 assert.equal(result.status,'denied');
});
test('rejects missing trusted artifact',async()=>{
 const result=await validateDeploymentRequest(request(original),context({'index.html':'<html></html>','styles.css':'body{}'}));
 assert.equal(result.status,'denied');
});
test('rejects client request with duplicate artifact name',async()=>{
 const req=request(original);req.files[2]={...req.files[1]};
 const result=await validateDeploymentRequest(req,context(original));
 assert.equal(result.status,'denied');
});

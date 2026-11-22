import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneDeploymentServer} from '../standalone-server.js';
const origin='https://www.xsusstudio.com';
async function withServer(run){
 const server=createStandaloneDeploymentServer({allowedOrigins:[origin]});
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',resolve).once('error',reject));
 try {await run('http://127.0.0.1:'+server.address().port);}
 finally {await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}
test('approved browser preflight permits only auth and JSON headers',async()=>withServer(async base=>{
 const res=await fetch(base+'/api/projects/review',{method:'OPTIONS',headers:{
  origin,'access-control-request-method':'POST',
  'access-control-request-headers':'authorization,content-type'}});
 assert.equal(res.status,204);
 assert.equal(res.headers.get('access-control-allow-origin'),origin);
 assert.equal(res.headers.get('access-control-allow-methods'),'POST');
}));
test('unknown origins cannot preflight authenticated review',async()=>withServer(async base=>{
 const res=await fetch(base+'/api/projects/review',{method:'OPTIONS',headers:{
  origin:'https://evil.example','access-control-request-method':'POST',
  'access-control-request-headers':'authorization'}});
 assert.equal(res.status,403);
 assert.equal(res.headers.get('access-control-allow-origin'),null);
}));
test('unapproved custom headers are rejected',async()=>withServer(async base=>{
 const res=await fetch(base+'/api/projects/review',{method:'OPTIONS',headers:{
  origin,'access-control-request-method':'POST',
  'access-control-request-headers':'authorization,x-admin'}});
 assert.equal(res.status,403);
}));
test('approved origin receives CORS response even on missing authentication',async()=>withServer(async base=>{
 const res=await fetch(base+'/api/projects/review',{method:'POST',headers:{
  origin,'content-type':'application/json'},body:'{}'});
 assert.equal(res.status,401);
 assert.equal(res.headers.get('access-control-allow-origin'),origin);
}));

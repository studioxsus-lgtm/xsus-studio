import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createStandaloneDeploymentServer} from '../standalone-server.js';

async function request(port,{path='/healthz',method='GET',headers={},body=''}={}) {
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path,method,headers},res=>{
   const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(Buffer.concat(chunks).toString())}));
  });req.on('error',reject);req.end(body);
 });
}
async function withServer(run) {
 const server=createStandaloneDeploymentServer({allowedOrigins:['https://www.xsusstudio.com']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await run(server.address().port);} finally {await new Promise(resolve=>server.close(resolve));}
}
test('health endpoint reports no deployment capability',()=>withServer(async port=>{
 const r=await request(port);assert.equal(r.status,200);assert.equal(r.body.deploymentEnabled,false);
 assert.equal(r.headers['cache-control'],'no-store');
}));
test('health endpoint does not accept POST',()=>withServer(async port=>{
 assert.equal((await request(port,{method:'POST'})).status,404);
}));
test('unrelated routes are not exposed',()=>withServer(async port=>{
 assert.equal((await request(port,{path:'/api/chat'})).status,404);
}));
test('validation route does not accept GET',()=>withServer(async port=>{
 assert.equal((await request(port,{path:'/api/deployments/validate'})).status,405);
}));
test('validation requires bearer token',()=>withServer(async port=>{
 const r=await request(port,{path:'/api/deployments/validate',method:'POST',headers:{origin:'https://www.xsusstudio.com','content-type':'application/json'},body:'{}'});
 assert.equal(r.status,401);assert.equal(r.body.deployed,false);
}));
test('configured token without trusted dependencies fails closed',()=>withServer(async port=>{
 const r=await request(port,{path:'/api/deployments/validate',method:'POST',headers:{origin:'https://www.xsusstudio.com','content-type':'application/json',authorization:'Bearer placeholder'},body:'{}'});
 assert.equal(r.status,503);assert.equal(r.body.deployed,false);
}));

import {describe,it,expect} from 'vitest';
import {createStandaloneDeploymentServer} from '../../services/src/deployment/standalone-server.js';
import http from 'node:http';
async function withServer(fn) {
 const server=createStandaloneDeploymentServer({allowedOrigins:['https://www.xsusstudio.com']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await fn(server.address().port);} finally {await new Promise(resolve=>server.close(resolve));}
}
const request=(port,path,method='GET')=>new Promise((resolve,reject)=>{
 const req=http.request({hostname:'127.0.0.1',port,path,method},res=>{
  let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(body)}));
 });req.on('error',reject);req.end();
});
describe('isolated XSUS App deployment server',()=>{
 it('reports healthy without claiming deployment readiness',async()=>withServer(async port=>{
  const r=await request(port,'/healthz');expect(r.status).toBe(200);
  expect(r.body.deploymentEnabled).toBe(false);
 }));
 it('does not expose unrelated AI Core routes',async()=>withServer(async port=>{
  expect((await request(port,'/api/chat')).status).toBe(404);
 }));
 it('rejects validation GET requests',async()=>withServer(async port=>{
  expect((await request(port,'/api/deployments/validate')).status).toBe(405);
 }));
});

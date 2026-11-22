import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneDeploymentServer} from '../standalone-server.js';

test('standalone server exposes health but never advertises deployment enabled',async()=>{
 const server=createStandaloneDeploymentServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try {
  const base='http://127.0.0.1:'+server.address().port;
  const health=await fetch(base+'/healthz');
  assert.equal(health.status,200);
  const body=await health.json();
  assert.equal(body.ok,true);
  assert.equal(body.deploymentEnabled,false);
  const missing=await fetch(base+'/api/deployments/execute');
  assert.equal(missing.status,404);
  assert.equal((await missing.json()).deployed,false);
  const invalidMethod=await fetch(base+'/api/deployments/validate');
  assert.equal(invalidMethod.status,405);
  assert.equal((await invalidMethod.json()).deployed,false);
 } finally {
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }
});

// Read-only smoke test for the isolated XSUS App API.
// Never sends credentials, modifies state, or triggers deployments.
import assert from 'node:assert/strict';

const base=process.env.XSUS_APP_API_URL;
if (!base || !/^https:\/\/[-a-z0-9.]+$/i.test(base)) throw new Error('HTTPS XSUS_APP_API_URL required');
const origin='https://www.xsusstudio.com';

async function probe(path,init={}) {
  const response=await fetch(base+path,{...init,signal:AbortSignal.timeout(20000),redirect:'error'});
  const body=await response.json();
  return {response,body};
}

async function healthWithColdStartRetry() {
  let last;
  for(let attempt=0;attempt<4;attempt++) {
    try {return await probe('/healthz');}
    catch(error) {
      last=error;
      if(attempt<3) await new Promise(resolve=>setTimeout(resolve,5000));
    }
  }
  throw last;
}

const health=await healthWithColdStartRetry();
assert.equal(health.response.status,200,'Health endpoint must return HTTP 200');
assert.equal(health.body.ok,true);
assert.equal(health.body.service,'xsus-app-deployment-validation');
assert.equal(health.body.deploymentEnabled,false,'Deployment execution must remain disabled');
console.log('PASS: health reports deployment disabled');

const unrelated=await probe('/api/chat');
assert.equal(unrelated.response.status,404,'XSUS AI Core route must not be exposed');
console.log('PASS: no XSUS AI Core route');

const method=await probe('/api/deployments/validate');
assert.equal(method.response.status,405);
assert.equal(method.body.deployed,false);
console.log('PASS: validation GET rejected');

const noToken=await probe('/api/deployments/validate',{
  method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'
});
assert.equal(noToken.response.status,401);
assert.equal(noToken.body.deployed,false);
console.log('PASS: missing bearer token rejected');

const noBackend=await probe('/api/deployments/validate',{
  method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer smoke-test-placeholder'},body:'{}'
});
assert.equal(noBackend.response.status,503);
assert.equal(noBackend.body.deployed,false);
console.log('PASS: missing trusted backend dependencies fail closed');

import test from 'node:test';import assert from 'node:assert/strict';import {createBrandCoreClient} from './brand-v5/core-client.mjs';
const request={version:'5.0.0',operation:'brand.interpret',requestId:'test-1',prompt:'manual "AXION"',language:'en'};
const config={url:'https://example.com/internal/logo/interpret',token:'x'.repeat(32),operation:'brand.interpret'};
test('V5 HTTP authenticated correlated response',async()=>{const client=createBrandCoreClient({...config,fetchImpl:async(url,o)=>{assert.equal(o.headers.authorization,'Bearer '+config.token);assert.equal(o.redirect,'error');assert.deepEqual(JSON.parse(o.body),request);return Response.json({version:'5.0.0',requestId:'test-1'});}});assert.equal((await client(request)).requestId,'test-1');});
test('V5 HTTP rejects invalid transport',()=>assert.throws(()=>createBrandCoreClient({...config,url:'http://example.com'})));
test('V5 HTTP rejects wrong correlation',async()=>assert.rejects(createBrandCoreClient({...config,fetchImpl:async()=>Response.json({version:'5.0.0',requestId:'wrong'})})(request)));
test('V5 HTTP rejects upstream failure',async()=>assert.rejects(createBrandCoreClient({...config,fetchImpl:async()=>new Response('',{status:503})})(request)));
test('V5 HTTP rejects oversized response',async()=>assert.rejects(createBrandCoreClient({...config,fetchImpl:async()=>Response.json({data:'x'.repeat(70000)})})(request)));
test('V5 HTTP rejects legacy request',async()=>assert.rejects(createBrandCoreClient(config)({...request,version:'1.0.0'})));

import test from 'node:test';import assert from 'node:assert/strict';import {brandProject,validateBrandRequest} from './brand-v5/gateway.mjs';
const input={action:'prepare',projectId:'11111111-1111-4111-8111-111111111111',revision:1,prompt:'manual "AXION"',language:'en'};
test('brand gateway rejects client document and owner',()=>{validateBrandRequest(input);assert.throws(()=>validateBrandRequest({...input,doc:{}}));assert.throws(()=>validateBrandRequest({...input,owner:'other'}));});
test('brand gateway reads owner scoped project',async()=>{const r=await brandProject({url:'https://example.com',headers:{},owner:'owner-a',input,fetchImpl:async u=>{assert.equal(u.searchParams.get('owner_id'),'eq.owner-a');return Response.json([]);}});assert.equal(r.status,404);});
test('brand gateway rejects stale revision',async()=>{const r=await brandProject({url:'https://example.com',headers:{},owner:'owner-a',input,fetchImpl:async()=>Response.json([{revision:2}])});assert.equal(r.status,409);});

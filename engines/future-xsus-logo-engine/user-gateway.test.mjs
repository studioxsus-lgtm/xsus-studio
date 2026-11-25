import test from 'node:test';
import assert from 'node:assert/strict';
import {createUserGateway} from './user-gateway.mjs';
const token='Bearer '+ 'a'.repeat(40);
const input={prompt:'Logo for "Nova"',language:'en'};
const id='12345678-1234-1234-1234-123456789abc';
function setup(options={}){
 let calls=0;
 const gateway=createUserGateway({supabaseUrl:'https://example.com',publishableKey:'public-key',fetchImpl:async()=>Response.json({id}),orchestrator:{generate:async r=>{calls++;return {...r,status:'generated'}}},...options});
 return {gateway,call:(overrides={})=>gateway({authorization:token,input,...overrides}),calls:()=>calls};
}
test('authenticated generation uses server request id',async()=>{const s=setup();const r=await s.call();assert.equal(r.status,200);assert.match(r.body.requestId,/^[0-9a-f-]{36}$/);assert.equal(s.calls(),1)});
for(const authorization of [undefined,'Basic abc','Bearer short','Bearer '+ 'a'.repeat(8193)])test('reject invalid authorization '+String(authorization).length,async()=>{const s=setup();assert.equal((await s.call({authorization})).status,401);assert.equal(s.calls(),0)});
for(const invalid of [null,{prompt:'',language:'en'},{prompt:'x'.repeat(4001),language:'en'},{prompt:'x',language:'de'},{...input,requestId:'forged'},{...input,owner_id:id}])test('reject invalid input '+JSON.stringify(invalid).slice(0,30),async()=>{const s=setup();assert.equal((await s.call({input:invalid})).status,400);assert.equal(s.calls(),0)});
test('expired session rejected',async()=>{const s=setup({fetchImpl:async()=>new Response(null,{status:401})});assert.equal((await s.call()).status,401);assert.equal(s.calls(),0)});
test('auth outage fails closed',async()=>{const s=setup({fetchImpl:async()=>new Response(null,{status:500})});assert.equal((await s.call()).status,503);assert.equal(s.calls(),0)});
test('invalid user response rejected',async()=>{const s=setup({fetchImpl:async()=>Response.json({id:'bad'})});assert.equal((await s.call()).status,401)});
test('quota expires and resets',async()=>{let now=0;const s=setup({clock:()=>now});for(let i=0;i<5;i++)assert.equal((await s.call()).status,200);assert.equal((await s.call()).status,429);now=60000;assert.equal((await s.call()).status,200)});
test('different users have separate quotas',async()=>{const s=setup({fetchImpl:async(url,opts)=>Response.json({id:opts.headers.authorization===token?id:'22345678-1234-1234-1234-123456789abc'})});for(let i=0;i<5;i++)await s.call();assert.equal((await s.call()).status,429);assert.equal((await s.call({authorization:'Bearer '+'b'.repeat(40)})).status,200)});
test('concurrency cap and recovery',async()=>{let release;const gate=new Promise(r=>{release=r});const s=setup({fetchImpl:async()=>{await gate;return Response.json({id})}});const pending=Array.from({length:8},()=>s.call());assert.equal((await s.call()).status,429);release();await Promise.all(pending);assert.equal((await s.call()).body.error,'rate_limit')});
test('upstream failure hides internal details',async()=>{const s=setup({orchestrator:{generate:async()=>{throw Error('private token')}}});assert.deepEqual(await s.call(),{status:503,body:{error:'generation_unavailable'}})});
test('reject insecure auth URL',()=>assert.throws(()=>setup({supabaseUrl:'http://example.com'})));
test('forwards session only to configured auth endpoint',async()=>{const s=setup({fetchImpl:async(url,opts)=>{assert.equal(url.href,'https://example.com/auth/v1/user');assert.equal(opts.headers.authorization,token);assert.equal(opts.redirect,'error');return Response.json({id})}});assert.equal((await s.call()).status,200)});

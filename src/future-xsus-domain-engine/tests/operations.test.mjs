import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperationService} from '../operations.mjs';
function fixture(){
 const rows=new Map(),id=(a,k)=>JSON.stringify([a,k]);
 const store={async insertOnce(a,k,v){const i=id(a,k);if(!rows.has(i))rows.set(i,structuredClone(v));return structuredClone(rows.get(i));},async get(a,k){return structuredClone(rows.get(id(a,k)));},async compareAndSet(a,k,r,v){const i=id(a,k);if(rows.get(i)?.revision!==r)return false;rows.set(i,structuredClone(v));return true;}};
 const service=createOperationService(store,{clock:()=>1000});
 const quote={domain:'example.com',operation:'register',years:1,providerId:'p',quoteId:'q',amountMinor:100,currency:'EUR',expiresAt:2000};
 return {service,quote};
}
test('duplicate draft returns original identity',async()=>{const {service,quote}=fixture();assert.equal((await service.draft('a','r',quote)).id,(await service.draft('a','r',quote)).id);});
test('changed price conflicts',async()=>{const {service,quote}=fixture();await service.draft('a','r',quote);await assert.rejects(service.draft('a','r',{...quote,amountMinor:200}),/Idempotency conflict/);});
test('tenant isolation',async()=>{const {service,quote}=fixture();await service.draft('a','r',quote);await assert.rejects(service.transition('b','r','cancelled',{expectedRevision:0}),/not found/);});
test('approval binds digest',async()=>{const {service,quote}=fixture();const d=await service.draft('a','r',quote);await assert.rejects(service.transition('a','r','approved',{expectedRevision:0,approvedDigest:'wrong'}));const r=await service.transition('a','r','approved',{expectedRevision:0,approvedDigest:d.digest});assert.equal(r.status,'approved');assert.equal(r.executed,false);assert.equal(r.history.length,2);});
test('concurrent transitions allow one winner',async()=>{const {service,quote}=fixture();const d=await service.draft('a','r',quote);const r=await Promise.allSettled([service.transition('a','r','approved',{expectedRevision:0,approvedDigest:d.digest}),service.transition('a','r','cancelled',{expectedRevision:0})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);});
test('execution is disabled',async()=>{const {service,quote}=fixture();await service.draft('a','r',quote);await assert.rejects(service.transition('a','r','executed',{expectedRevision:0}));});
test('cancelled is terminal',async()=>{const {service,quote}=fixture();const d=await service.draft('a','r',quote);await service.transition('a','r','cancelled',{expectedRevision:0});await assert.rejects(service.transition('a','r','approved',{expectedRevision:1,approvedDigest:d.digest}));});

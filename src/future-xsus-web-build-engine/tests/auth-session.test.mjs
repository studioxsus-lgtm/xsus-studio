import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionAdapter} from '../auth-session.mjs';
function setup(initial=null){let session=initial,listener,closed=false;const changes=[];const auth={getSession:async()=>({data:{session}}),onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){closed=true}}}}}};const adapter=createSessionAdapter({auth,onIdentityChange:id=>changes.push(id)});return {auth,adapter,changes,emit(s){session=s;listener('CHANGE',s)},closed:()=>closed}}
const user=(id,token='token')=>({user:{id},access_token:token});
test('authenticated token',async()=>{const s=setup(user('a'));assert.equal(await s.adapter.getToken(),'token');assert.deepEqual(s.changes,['a'])});
test('anonymous rejected',async()=>{await assert.rejects(setup().adapter.getToken(),/Authentication required/)});
test('account switch observed',async()=>{const s=setup(user('a'));await s.adapter.getToken();s.emit(user('b','new'));assert.equal(await s.adapter.getToken(),'new');assert.deepEqual(s.changes,['a','b'])});
test('refresh does not reset same account',async()=>{const s=setup(user('a'));await s.adapter.getToken();s.emit(user('a','new'));assert.equal(await s.adapter.getToken(),'new');assert.deepEqual(s.changes,['a'])});
test('logout clears identity',async()=>{const s=setup(user('a'));await s.adapter.getToken();s.emit(null);await assert.rejects(s.adapter.getToken());assert.deepEqual(s.changes,['a',null])});
test('stale session response rejected',async()=>{const s=setup();let resolve;s.auth.getSession=()=>new Promise(r=>resolve=r);const pending=s.adapter.getToken();s.emit(user('b'));resolve({data:{session:user('a')}});await assert.rejects(pending,/Session unavailable/)});
test('provider error rejected',async()=>{const s=setup();s.auth.getSession=async()=>({error:new Error('provider')});await assert.rejects(s.adapter.getToken(),/Session unavailable/)});
test('dispose unsubscribes and rejects access',async()=>{const s=setup(user('a'));await s.adapter.getToken();s.adapter.dispose();assert.equal(s.closed(),true);await assert.rejects(s.adapter.getToken());assert.deepEqual(s.changes,['a',null])});

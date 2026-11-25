import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNotificationRuntime} from '../notifications.mjs';
const payload={channel:'email',message:'Hello'};
function fixture(send=async()=>{},maxAttempts=3){let now=0;const r=createNotificationRuntime({verifyIdentity:async t=>t==='bad'?null:{id:t,roles:t==='worker'?['notification_worker']:[]},adapters:{email:send},clock:()=>now,maxAttempts});return {r,advance:n=>now+=n}}
async function queued(r){await r.setPreferences('a',['email']);return r.enqueue('a',payload)}
test('consent required',async()=>assert.rejects(fixture().r.enqueue('a',payload),/Consent/));
test('queue',async()=>assert.equal((await queued(fixture().r)).status,'queued'));
test('private list',async()=>{const {r}=fixture();await queued(r);assert.deepEqual(await r.list('b'),[])});
test('worker role required',async()=>assert.rejects(fixture().r.dispatch('a'),/Forbidden/));
test('unauthorized',async()=>assert.rejects(fixture().r.list('bad'),/Unauthorized/));
test('delivery',async()=>{const {r}=fixture(async j=>assert.equal(j.owner,'a'));await queued(r);await r.dispatch('worker');assert.equal((await r.list('a'))[0].status,'delivered')});
test('revoked consent',async()=>{const {r}=fixture();await queued(r);await r.setPreferences('a',[]);await r.dispatch('worker');assert.equal((await r.list('a'))[0].status,'cancelled')});
test('retry delay',async()=>{const {r,advance}=fixture(async()=>{throw Error()});await queued(r);await r.dispatch('worker');assert.deepEqual(await r.dispatch('worker'),[]);advance(1000);await r.dispatch('worker');assert.equal((await r.list('a'))[0].attempts,2)});
test('retry limit',async()=>{const {r}=fixture(async()=>{throw Error()},1);await queued(r);await r.dispatch('worker');assert.equal((await r.list('a'))[0].status,'failed')});
test('invalid channel',async()=>assert.rejects(fixture().r.setPreferences('a',['unknown'])));
test('empty message',async()=>{const {r}=fixture();await r.setPreferences('a',['email']);await assert.rejects(r.enqueue('a',{...payload,message:' '}))});
test('missing adapter stays queued',async()=>{const {r}=fixture();await r.setPreferences('a',['sms']);await r.enqueue('a',{...payload,channel:'sms'});await r.dispatch('worker');assert.equal((await r.list('a'))[0].status,'queued')});
test('parallel dispatch does not duplicate in flight',async()=>{let calls=0;const {r}=fixture(async()=>{calls++});await queued(r);await Promise.all([r.dispatch('worker'),r.dispatch('worker')]);assert.equal(calls,1)});

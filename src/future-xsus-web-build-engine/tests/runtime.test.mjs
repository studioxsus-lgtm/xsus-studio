import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationState as create,bindApplication} from '../runtime.mjs';
test('initial state',()=>assert.deepEqual(create({count:1}).snapshot(),{revision:0,values:{count:1}}));
test('update',()=>assert.equal(create({count:1}).update({count:2},0).values.count,2));
test('stale revision',()=>{const s=create({count:1});s.update({count:2},0);assert.throws(()=>s.update({count:3},0))});
test('atomic invalid patch',()=>{const s=create({count:1});assert.throws(()=>s.update({count:2,missing:3},0));assert.equal(s.snapshot().values.count,1)});
test('rejects nonfinite number',()=>assert.throws(()=>create({count:Infinity})));
test('rejects unsafe key',()=>assert.throws(()=>create({constructor:1})));
test('snapshot isolated',()=>{const s=create({count:1});s.snapshot().values.count=9;assert.equal(s.snapshot().values.count,1)});
test('subscribe and unsubscribe',()=>{const s=create({count:1});let n=0;const off=s.subscribe(()=>n++);s.update({count:2},0);off();s.update({count:3},1);assert.equal(n,1)});
test('observer failure does not rollback',()=>{const s=create({count:1});s.subscribe(()=>{throw Error('observer')});assert.equal(s.update({count:2},0).revision,1)});
function fixture(){const listeners=new Map();const out={textContent:'',hasAttribute:k=>k==='data-xs-text',getAttribute:()=> 'name'};const input={value:'',type:'text',hasAttribute:()=>false,getAttribute:()=> 'name',addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};return {out,input,listeners,container:{querySelectorAll:q=>q==='[data-xs-text]'?[out]:[input]}}}
test('binds initial text',()=>{const f=fixture();bindApplication({...f,store:create({name:'Demo'})});assert.equal(f.out.textContent,'Demo')});
test('input change updates state',()=>{const f=fixture(),store=create({name:'Demo'});bindApplication({...f,store});f.input.value='New';f.listeners.get('change')();assert.equal(store.snapshot().values.name,'New');assert.equal(f.out.textContent,'New')});
test('unmount removes listeners',()=>{const f=fixture();const off=bindApplication({...f,store:create({name:'Demo'})});off();assert.equal(f.listeners.size,0)});
test('unknown binding rejected',()=>{const f=fixture();assert.throws(()=>bindApplication({...f,store:create({other:1})}))});

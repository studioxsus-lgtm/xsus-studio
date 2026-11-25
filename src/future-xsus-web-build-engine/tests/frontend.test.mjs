import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFrontendRuntime} from '../frontend.mjs';
function node(tag){return {tag,children:[],attrs:{},value:'',append(...n){this.children.push(...n)},replaceChildren(...n){this.children=n},setAttribute(k,v){this.attrs[k]=v},reset(){}}}
const document={createElement:node};
const resources=[{name:'products',fields:{name:'string',stock:'number'}}];
function fixture(options={}){const calls=[];const runtime=createFrontendRuntime({document,resources,getToken:async()=>'token',fetchImpl:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>[]}},...options});return {runtime,calls,host:node('main')}}
test('resource registry',()=>assert.deepEqual(fixture().runtime.resources(),['products']));
test('mount loads API',async()=>{const {runtime,calls,host}=fixture();await runtime.mount('products',host);assert.equal(calls[0].url,'/products');assert.equal(calls[0].opts.headers.Authorization,'Bearer token')});
test('mount creates form and table',async()=>{const {runtime,host}=fixture();await runtime.mount('products',host);assert.deepEqual(host.children[0].children.map(n=>n.tag),['form','input','output','table'])});
test('busy cleared',async()=>{const {runtime,host}=fixture();await runtime.mount('products',host);assert.equal(host.children[0].attrs['aria-busy'],'false')});
test('unknown resource rejected',async()=>{const {runtime,host}=fixture();await assert.rejects(runtime.mount('unknown',host))});
test('duplicate mount rejected',async()=>{const {runtime,host}=fixture();await runtime.mount('products',host);await assert.rejects(runtime.mount('products',host))});
test('unmount clears DOM',async()=>{const {runtime,host}=fixture();await runtime.mount('products',host);assert.equal(runtime.unmount(host),true);assert.equal(host.children.length,0)});
test('unmount unknown host',()=>{const {runtime,host}=fixture();assert.equal(runtime.unmount(host),false)});
test('remount allowed',async()=>{const {runtime,host,calls}=fixture();await runtime.mount('products',host);runtime.unmount(host);await runtime.mount('products',host);assert.equal(calls.length,2)});
test('duplicate schema rejected',()=>assert.throws(()=>fixture({resources:[resources[0],resources[0]]})));
test('missing identity adapter rejected',()=>assert.throws(()=>fixture({getToken:null})));
test('API failure visible',async()=>{const {runtime,host}=fixture({fetchImpl:async()=>({ok:false,status:500})});await runtime.mount('products',host);assert.equal(host.children[0].children[2].textContent,'Operation failed')});
test('refresh invokes API again',async()=>{const {runtime,host,calls}=fixture();const view=await runtime.mount('products',host);await view.refresh();assert.equal(calls.length,2)});
test('form submits data',async()=>{const {runtime,host,calls}=fixture();await runtime.mount('products',host);const form=host.children[0].children[0];form.children[0].children[0].value='Item';form.children[1].children[0].valueAsNumber=3;await form.onsubmit({preventDefault(){}});assert.equal(calls[1].opts.method,'POST');assert.deepEqual(JSON.parse(calls[1].opts.body),{name:'Item',stock:3})});

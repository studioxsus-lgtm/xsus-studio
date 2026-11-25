import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateUnifiedProject} from '../pipeline.mjs';
import {createPreviewServer} from '../preview.mjs';
const draft=()=>generateUnifiedProject({name:'Demo',pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Welcome'}]}]});
async function run(fn){const s=createPreviewServer(draft());const url=await s.start();try{await fn(url)}finally{await s.stop()}}
test('loopback only',()=>run(async url=>assert.match(url,/^http:\/\/127\.0\.0\.1:/)));
test('serves HTML',()=>run(async url=>{const r=await fetch(url);assert.equal(r.status,200);assert.match(await r.text(),/Welcome/)}));
test('serves CSS',()=>run(async url=>assert.match((await fetch(url+'/design.css')).headers.get('content-type'),/text\/css/)));
test('blocks scripts and network',()=>run(async url=>{const c=(await fetch(url)).headers.get('content-security-policy');assert.match(c,/script-src 'none'/);assert.match(c,/connect-src 'none'/)}));
test('sandbox header',()=>run(async url=>assert.match((await fetch(url)).headers.get('content-security-policy'),/sandbox/)));
test('rejects POST',()=>run(async url=>assert.equal((await fetch(url,{method:'POST'})).status,405)));
test('missing path',()=>run(async url=>assert.equal((await fetch(url+'/missing.html')).status,404)));
test('encoded path rejected',()=>run(async url=>assert.equal((await fetch(url+'/%69ndex.html')).status,404)));
test('HEAD empty body',()=>run(async url=>assert.equal(await (await fetch(url,{method:'HEAD'})).text(),'')));
test('no caching',()=>run(async url=>assert.equal((await fetch(url)).headers.get('cache-control'),'no-store')));
test('rejects published project',()=>assert.throws(()=>createPreviewServer({...draft(),status:'published'})));
test('publication remains disabled',()=>assert.equal(createPreviewServer(draft()).publicationAuthorized,false));

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedWorkspace} from '../unified-workspace.mjs';
import {generateUnifiedProject} from '../pipeline.mjs';
import {buildArchive} from '../build.mjs';
const id='11111111-1111-4111-8111-111111111111';
function setup(){
 const project=generateUnifiedProject({name:'Site',pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Home',body:'Welcome'}]}]});
 const archive=buildArchive(project).archive;
 let revision=0,files;
 const calls=[];
 const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
 const app=createUnifiedWorkspace({baseUrl:'https://example.com',getToken:async()=> 'token',fetchImpl:async(url,opt)=>{
 calls.push({path:url.pathname,method:opt.method});
 if(url.pathname==='/projects')return json(opt.method==='POST'?{job:{id,status:'completed'}}:[{id,status:'completed'}]);
 if(url.pathname.endsWith('/download'))return new Response(archive,{headers:{'Content-Type':'application/zip'}});
 if(url.pathname.endsWith('/regenerate'))return json({files:{'index.html':'replacement'},reviewRequired:true,executable:false});
 if(url.pathname.endsWith('/versions')){
 if(opt.method==='POST'){const body=JSON.parse(opt.body);assert.equal(body.expectedRevision,revision);files=body.files;revision++}
 return json({revision});
 }
 if(url.pathname.endsWith('/versions/'+revision))return json({revision,files});
 throw Error('Unexpected route');
 }});
 return {app,calls};
}
const input={name:'Site',prompt:'Build a site',language:'en'};
test('generate imports source into editor',async()=>{const {app}=setup();await app.generate(input);assert.equal(app.snapshot().workspace.id,id);assert.ok(app.snapshot().workspace.source.files['index.html'])});
test('list projects',async()=>{const {app}=setup();assert.equal((await app.list())[0].id,id)});
test('save and reopen edited source',async()=>{const {app}=setup();await app.generate(input);app.workspace.edit('update','index.html','edited',0);await app.workspace.save();app.reset();await app.open(id,input);assert.equal(app.snapshot().workspace.source.files['index.html'],'edited')});
test('unsaved changes prevent switching',async()=>{const {app}=setup();await app.generate(input);await assert.rejects(app.open(id,input),/Unsaved changes/)});
test('regeneration requires acceptance',async()=>{const {app}=setup();await app.generate(input);const before=app.snapshot().workspace.source.files;await app.workspace.prepare('Change site');assert.deepEqual(app.snapshot().workspace.source.files,before);app.workspace.accept(0);assert.equal(app.snapshot().workspace.source.files['index.html'],'replacement')});
test('reject proposal preserves source',async()=>{const {app}=setup();await app.generate(input);const before=app.snapshot().workspace.source.files;await app.workspace.prepare('Change site');app.workspace.reject();assert.deepEqual(app.snapshot().workspace.source.files,before)});
test('reset clears session',async()=>{const {app}=setup();await app.generate(input);app.reset();assert.equal(app.snapshot().workspace.id,null);assert.equal(app.snapshot().metadata,null)});
test('original archive download',async()=>{const {app}=setup();await app.generate(input);assert.ok((await app.downloadOriginal()).size>0)});

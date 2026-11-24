import test from 'node:test';
import assert from 'node:assert/strict';
import {startStandaloneDeploymentServer} from '../standalone-server.js';
const origin='https://www.xsusstudio.com';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const token='a'.repeat(24);
const client={
 auth:{getUser:async()=>({data:{user:{id:ownerId}},error:null})},
 from:()=>({
  select(){return this;},eq(){return this;},
  async maybeSingle(){return {data:{id:projectId,owner_id:ownerId,snapshot:{version:1}},error:null};}
 })
};
async function request(server){
 const base='http://127.0.0.1:'+server.address().port;
 return fetch(base+'/api/projects/review',{method:'POST',
  headers:{origin,'content-type':'application/json',authorization:'Bearer '+token},
  body:JSON.stringify({projectId})});
}
async function listening(server){
 if(server.listening)return;
 await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
}
async function close(server){await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
test('standalone server defaults to unavailable project review',async()=>{
 const server=startStandaloneDeploymentServer({env:{PORT:'0'},dependencies:{allowedOrigins:[origin]}});
 try {await listening(server);const response=await request(server);
  assert.equal(response.status,503);assert.equal((await response.json()).deployed,false);
 }finally{await close(server);}
});
test('partial trusted configuration fails before starting a server',()=>{
 assert.throws(()=>startStandaloneDeploymentServer({env:{PORT:'0'},supabaseClient:client}),TypeError);
});
test('trusted Supabase injection routes review through auth and builder without deployment',async()=>{
 let built=0;
 const server=startStandaloneDeploymentServer({env:{PORT:'0'},dependencies:{allowedOrigins:[origin]},
  supabaseClient:client,buildFromSavedProject:async()=>{built++;return null;}});
 try {await listening(server);const response=await request(server);
  assert.equal(response.status,409);
  assert.deepEqual(await response.json(),{status:'blocked',reason:'BUILD_NOT_AVAILABLE',deployed:false});
  assert.equal(built,1);
 }finally{await close(server);}
});

test('partial Supabase environment cannot silently disable project review',()=>{
 assert.throws(()=>startStandaloneDeploymentServer({env:{PORT:'0',
  XSUS_APP_SUPABASE_URL:'https://example.supabase.co'}}),/Incomplete XSUS App Supabase configuration/);
 assert.throws(()=>startStandaloneDeploymentServer({env:{PORT:'0',
  XSUS_APP_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'}}),/Incomplete XSUS App Supabase configuration/);
});
test('unsafe Supabase configuration fails before server starts',()=>{
 assert.throws(()=>startStandaloneDeploymentServer({env:{PORT:'0',
  XSUS_APP_SUPABASE_URL:'http://example.supabase.co',
  XSUS_APP_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'}}),/Invalid XSUS App Supabase configuration/);
 assert.throws(()=>startStandaloneDeploymentServer({env:{PORT:'0',
  XSUS_APP_SUPABASE_URL:'https://example.supabase.co',
  XSUS_APP_SUPABASE_PUBLISHABLE_KEY:'service_role_not_allowed'}}),/Invalid XSUS App Supabase configuration/);
});

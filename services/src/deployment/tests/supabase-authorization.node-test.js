import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseDeploymentContext} from '../supabase-project-authorization.js';

const projectId='project_123';
function fixture({userId='owner_1',projectOwner='owner_1',files={ 'index.html':'<html></html>','styles.css':'','app.js':'' }}={}) {
 const calls={projects:0,artifacts:0};
 const authClient={auth:{async getUser(token) {
   if(token==='valid') return {data:{user:{id:userId}},error:null};
   return {data:{user:null},error:{message:'invalid'}};
 }}};
 const projectStore={async findOwnedProject({projectId:id,ownerId}) {
   calls.projects++;
   return projectOwner===ownerId ? {id,ownerId:projectOwner}:null;
 }};
 const artifactStore={async loadFiles() {calls.artifacts++;return files;}};
 return {calls,authClient,projectStore,artifactStore};
}
test('valid owner may retrieve trusted files after verification',async()=>{
 const f=fixture();
 const ctx=createSupabaseDeploymentContext({...f,accessToken:'valid'});
 const user=await ctx.authenticate();
 assert.equal(await ctx.authorizeProject(user,projectId,'static-host'),true);
 assert.deepEqual(await ctx.loadTrustedFiles(user,projectId),{'index.html':'<html></html>','styles.css':'','app.js':''});
 assert.equal(f.calls.artifacts,1);
});
test('unverified identity cannot read project artifacts',async()=>{
 const f=fixture();const ctx=createSupabaseDeploymentContext({...f,accessToken:'valid'});
 await assert.rejects(()=>ctx.loadTrustedFiles({id:'owner_1'},projectId));
 assert.equal(f.calls.artifacts,0);
});
test('different owner cannot authorize or read artifacts',async()=>{
 const f=fixture({projectOwner:'someone_else'});
 const ctx=createSupabaseDeploymentContext({...f,accessToken:'valid'});
 const user=await ctx.authenticate();
 assert.equal(await ctx.authorizeProject(user,projectId,'static-host'),false);
 await assert.rejects(()=>ctx.loadTrustedFiles(user,projectId));
 assert.equal(f.calls.artifacts,0);
});
test('forged user identity cannot authorize',async()=>{
 const f=fixture();const ctx=createSupabaseDeploymentContext({...f,accessToken:'valid'});
 await ctx.authenticate();
 assert.equal(await ctx.authorizeProject({id:'attacker'},projectId,'static-host'),false);
 await assert.rejects(()=>ctx.loadTrustedFiles({id:'attacker'},projectId));
 assert.equal(f.calls.artifacts,0);
});
test('failed reauthentication clears previous verified identity',async()=>{
 let valid=true;const f=fixture();
 f.authClient.auth.getUser=async()=>valid?{data:{user:{id:'owner_1'}},error:null}:{data:{user:null},error:new Error('expired')};
 const ctx=createSupabaseDeploymentContext({...f,accessToken:'valid'});
 const user=await ctx.authenticate();valid=false;
 await assert.rejects(()=>ctx.authenticate());
 assert.equal(await ctx.authorizeProject(user,projectId,'static-host'),false);
 await assert.rejects(()=>ctx.loadTrustedFiles(user,projectId));
 assert.equal(f.calls.artifacts,0);
});
test('invalid project identifiers and targets are rejected',async()=>{
 const f=fixture();const ctx=createSupabaseDeploymentContext({...f,accessToken:'valid'});
 const user=await ctx.authenticate();
 assert.equal(await ctx.authorizeProject(user,'../escape','static-host'),false);
 assert.equal(await ctx.authorizeProject(user,projectId,'unknown-target'),false);
 await assert.rejects(()=>ctx.loadTrustedFiles(user,'../escape'));
 assert.equal(f.calls.artifacts,0);
});

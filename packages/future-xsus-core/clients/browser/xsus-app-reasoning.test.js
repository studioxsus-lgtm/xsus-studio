import test from "node:test";
import assert from "node:assert/strict";
import {createAppReasoning} from "./xsus-app-reasoning.js";
const input = {requestId:"app-test",query:"done",facts:["done"],rules:[]};
function setup(enabled=true) {
  let user="alice", calls=0;
  const supabase={auth:{getSession:async()=>({data:{session:user?{user:{id:user},access_token:"test-token"}:null}})}};
  const adapter=createAppReasoning({enabled,supabase,fetchImpl:async(url,options)=>{
    calls++;
    assert.equal(url,"https://future-xsus-core-api.onrender.com/v1/intelligence/reason");
    assert.equal(options.headers.Authorization,"Bearer test-token");
    return Response.json({contractVersion:"1.0.0",requestId:"app-test",status:"resolved",answer:"done",verifiedDerivation:true,executionAuthorized:false,limitations:[]});
  }});
  return {adapter,setUser:v=>{user=v},calls:()=>calls};
}
test("disabled by default policy",async()=>{const s=setup(false);await assert.rejects(s.adapter.reason(input),{code:"disabled"});assert.equal(s.calls(),0)});
test("authenticated request",async()=>{const s=setup();assert.equal((await s.adapter.reason(input)).answer,"done")});
test("signed out",async()=>{const s=setup();s.setUser(null);await assert.rejects(s.adapter.reason(input),{code:"unauthorized"});assert.equal(s.calls(),0)});
test("identity changes during request",async()=>{const s=setup();const p=s.adapter.reason(input);s.setUser("bob");await assert.rejects(p,{code:"identity_changed"})});
test("parallel request rejected and slot recovered",async()=>{const s=setup();const p=s.adapter.reason(input);await assert.rejects(s.adapter.reason(input),{code:"busy"});await p;await s.adapter.reason(input);assert.equal(s.calls(),2)});

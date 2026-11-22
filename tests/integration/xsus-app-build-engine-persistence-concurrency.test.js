import {describe,it,expect} from "vitest";
import {createExecutionPersistence} from "../../src/xsus-app-build-engine/sandbox/execution-persistence.js";
const executionId="execution-0001",ownerId="owner-0001";
function fakeDatabase(){
 const records=new Map();
 const query=async(sql,params)=>{
  if(sql.startsWith("INSERT")){
   const [id,owner,state,revision,fence,updatedAt]=params;
   if(records.has(id))return {rows:[]};
   records.set(id,{execution_id:id,owner_id:owner,state,revision,fence,updated_at_ms:updatedAt});
   return {rows:[{execution_id:id}]};
  }
  if(sql.startsWith("SELECT")){
   const record=records.get(params[0]);
   return {rows:record?[{...record}]:[]};
  }
  if(sql.startsWith("UPDATE")){
   const [id,owner,revision,state,nextRevision,nextFence,updatedAt,fence]=params;
   const current=records.get(id);
   if(!current||current.owner_id!==owner||current.revision!==revision||current.fence!==fence)return {rows:[]};
   records.set(id,{...current,state,revision:nextRevision,fence:nextFence,updated_at_ms:updatedAt});
   return {rows:[{execution_id:id}]};
  }
  throw new Error("Unexpected SQL");
 };
 return {records,query};
}
const setup=()=>{const db=fakeDatabase();return {...db,...createExecutionPersistence({query:db.query,clock:()=>12345})};};
describe("XSUS phase 36 persistence concurrency contract (simulated SQL)",()=>{
 it("rejects a missing PostgreSQL query adapter",()=>expect(()=>createExecutionPersistence()).toThrow("adapter"));
 it("persists registrations across registry instances",async()=>{const x=setup();await x.registry.register({executionId,ownerId});const another=createExecutionPersistence({query:x.query,clock:()=>12345});expect((await another.registry.get(executionId,{ownerId})).state).toBe("registered");});
 it("allows only one registration for a duplicate ID",async()=>{const x=setup();const outcomes=await Promise.allSettled([x.registry.register({executionId,ownerId}),x.registry.register({executionId,ownerId})]);expect(outcomes.filter(o=>o.status==="fulfilled")).toHaveLength(1);});
 it("allows only one competing state transition",async()=>{const x=setup();await x.registry.register({executionId,ownerId});const options={ownerId,expectedRevision:1,expectedFence:1,to:"running"};const outcomes=await Promise.allSettled([x.registry.transition(executionId,options),x.registry.transition(executionId,options)]);expect(outcomes.filter(o=>o.status==="fulfilled")).toHaveLength(1);expect((await x.registry.get(executionId,{ownerId})).revision).toBe(2);});
 it("rejects a stale fence after another worker advances",async()=>{const x=setup();await x.registry.register({executionId,ownerId});await x.registry.transition(executionId,{ownerId,expectedRevision:1,expectedFence:1,to:"running"});await expect(x.registry.transition(executionId,{ownerId,expectedRevision:1,expectedFence:1,to:"failed"})).rejects.toThrow("Stale");});
 it("blocks unauthorized ownership access",async()=>{const x=setup();await x.registry.register({executionId,ownerId});await expect(x.registry.get(executionId,{ownerId:"owner-0002"})).rejects.toThrow("unavailable");});
 it("does not allow recovery while running",async()=>{const x=setup();await x.registry.register({executionId,ownerId});await x.registry.transition(executionId,{ownerId,expectedRevision:1,expectedFence:1,to:"running"});await expect(x.registry.authorizeRecovery(executionId,{ownerId,expectedRevision:2,expectedFence:2})).rejects.toThrow("eligible");});
 it("preserves completed state across recreated registries",async()=>{const x=setup();await x.registry.register({executionId,ownerId});await x.registry.transition(executionId,{ownerId,expectedRevision:1,expectedFence:1,to:"running"});await x.registry.transition(executionId,{ownerId,expectedRevision:2,expectedFence:2,to:"completed"});const next=createExecutionPersistence({query:x.query,clock:()=>12345});expect((await next.registry.get(executionId,{ownerId})).state).toBe("completed");});
 it("authorizes recovery only after completion",async()=>{const x=setup();await x.registry.register({executionId,ownerId});await x.registry.transition(executionId,{ownerId,expectedRevision:1,expectedFence:1,to:"running"});await x.registry.transition(executionId,{ownerId,expectedRevision:2,expectedFence:2,to:"completed"});expect((await x.registry.authorizeRecovery(executionId,{ownerId,expectedRevision:3,expectedFence:3})).fence).toBe(4);});
 it("rejects duplicate recovery claims",async()=>{const x=setup();await x.registry.register({executionId,ownerId});await x.registry.transition(executionId,{ownerId,expectedRevision:1,expectedFence:1,to:"failed"});const options={ownerId,expectedRevision:2,expectedFence:2};const results=await Promise.allSettled([x.registry.authorizeRecovery(executionId,options),x.registry.authorizeRecovery(executionId,options)]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);});
});

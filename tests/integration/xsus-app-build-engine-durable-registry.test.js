import {describe,it,expect} from "vitest";
import {createDurableExecutionRegistry} from "../../src/xsus-app-build-engine/sandbox/durable-execution-registry.js";
const id="execution-0001",owner="owner-0001";
function fixture(){
 const records=new Map();
 const store={
  createIfAbsent:async(k,v)=>{if(records.has(k))return false;records.set(k,v);return true;},
  read:async k=>records.get(k),
  compareAndSwap:async(k,revision,fence,value)=>{const old=records.get(k);if(!old||old.revision!==revision||old.fence!==fence)return false;records.set(k,value);return true;}
 };
 return {records,store,registry:createDurableExecutionRegistry({store,clock:()=>1234})};
}
describe("XSUS phase 34 durable registry contract",()=>{
 it("requires atomic durable store",()=>expect(()=>createDurableExecutionRegistry()).toThrow("store"));
 it("registers a fenced execution",async()=>expect(await fixture().registry.register({executionId:id,ownerId:owner})).toMatchObject({revision:1,fence:1,state:"registered"}));
 it("rejects duplicate IDs",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});await expect(x.registry.register({executionId:id,ownerId:owner})).rejects.toThrow("already");});
 it("rejects other owners",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});await expect(x.registry.get(id,{ownerId:"owner-0002"})).rejects.toThrow("unavailable");});
 it("advances revision and fencing token",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});expect(await x.registry.transition(id,{ownerId:owner,expectedRevision:1,expectedFence:1,to:"running"})).toMatchObject({revision:2,fence:2,state:"running"});});
 it("rejects stale revisions",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});await expect(x.registry.transition(id,{ownerId:owner,expectedRevision:0,expectedFence:1,to:"running"})).rejects.toThrow("Stale");});
 it("rejects invalid transitions",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});await expect(x.registry.transition(id,{ownerId:owner,expectedRevision:1,expectedFence:1,to:"cleaned"})).rejects.toThrow("transition");});
 it("rejects recovery while running",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});await x.registry.transition(id,{ownerId:owner,expectedRevision:1,expectedFence:1,to:"running"});await expect(x.registry.authorizeRecovery(id,{ownerId:owner,expectedRevision:2,expectedFence:2})).rejects.toThrow("eligible");});
 it("permits recovery after completion",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});await x.registry.transition(id,{ownerId:owner,expectedRevision:1,expectedFence:1,to:"running"});await x.registry.transition(id,{ownerId:owner,expectedRevision:2,expectedFence:2,to:"completed"});expect((await x.registry.authorizeRecovery(id,{ownerId:owner,expectedRevision:3,expectedFence:3})).state).toBe("recovering");});
 it("fails closed on compare-and-swap conflicts",async()=>{const x=fixture();await x.registry.register({executionId:id,ownerId:owner});x.store.compareAndSwap=async()=>false;await expect(x.registry.transition(id,{ownerId:owner,expectedRevision:1,expectedFence:1,to:"running"})).rejects.toThrow("Concurrent");});
});

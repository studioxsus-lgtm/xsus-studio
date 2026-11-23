import {describe,it,expect,vi} from "vitest";
import {createExecutionLifecycle} from "../../src/xsus-app-build-engine/sandbox/execution-lifecycle.js";
const executionId="execution-0001",ownerId="owner-0001",zero="0".repeat(64);
function fixture(){
 let state=null,events=[];
 const queries=[];
 const connect=async()=>{
  let pendingState=state?{...state}:null,pendingEvents=events.map(e=>({...e}));
  return {release:vi.fn(),query:async(sql,p=[])=>{
   queries.push(sql);
   if(sql==="BEGIN"||sql==="ROLLBACK")return {rows:[]};
   if(sql==="COMMIT"){state=pendingState;events=pendingEvents;return {rows:[]};}
   if(sql.startsWith("INSERT INTO xsus_internal.build_executions")){
    if(pendingState)return {rows:[]};
    pendingState={execution_id:p[0],owner_id:p[1],state:p[2],revision:p[3],fence:p[4],updated_at_ms:p[5]};return {rows:[{execution_id:p[0]}]};
   }
   if(sql.startsWith("INSERT INTO xsus_internal.build_execution_audit")){
    const [id,seq,revision,fence,from,to,timestamp,previousHash,hash,version]=p;
    if(id!==executionId||pendingEvents.some(e=>e.sequence===seq))return {rows:[]};
    pendingEvents.push({sequence:seq,revision,fence,from_state:from,to_state:to,timestamp_ms:timestamp,previous_hash:previousHash,hash,version});
    return {rows:[{sequence:seq}]};
   }
   if(sql.includes("FROM xsus_internal.build_executions")&&sql.includes("FOR UPDATE"))return {rows:pendingState?[{...pendingState}]:[]};
   if(sql.includes("FROM xsus_internal.build_execution_audit")&&sql.includes("ORDER BY"))return {rows:pendingEvents.length?[{...pendingEvents.at(-1)}]:[]};
   if(sql.startsWith("UPDATE xsus_internal.build_executions")){
    if(!pendingState||pendingState.execution_id!==p[0]||pendingState.owner_id!==p[1]||pendingState.revision!==p[2]||pendingState.fence!==p[7])return {rows:[]};
    pendingState={...pendingState,state:p[3],revision:p[4],fence:p[5],updated_at_ms:p[6]};return {rows:[{execution_id:p[0]}]};
   }
   throw new Error("Unexpected SQL");
  }};
 };
 return {lifecycle:createExecutionLifecycle({connect,clock:()=>100}),getState:()=>state,getEvents:()=>events,queries};
}
describe("XSUS phase 41 lifecycle composition (mock database)",()=>{
 it("requires a trusted connection",()=>expect(()=>createExecutionLifecycle()).toThrow("dependencies"));
 it("registers genesis state and audit",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});expect(r.audit.sequence).toBe(1);expect(x.getEvents()).toHaveLength(1);});
 it("starts a registered execution",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});const next=await x.lifecycle.start(executionId,ownerId,r.execution);expect(next.execution.state).toBe("running");expect(x.getEvents()).toHaveLength(2);});
 it("completes a running execution",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});const s=await x.lifecycle.start(executionId,ownerId,r.execution);expect((await x.lifecycle.complete(executionId,ownerId,s.execution)).execution.state).toBe("completed");});
 it("supports failure and recovery",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});const f=await x.lifecycle.fail(executionId,ownerId,r.execution);expect((await x.lifecycle.authorizeRecovery(executionId,ownerId,f.execution)).execution.state).toBe("recovering");});
 it("supports cleaned after recovery",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});const f=await x.lifecycle.fail(executionId,ownerId,r.execution);const rec=await x.lifecycle.authorizeRecovery(executionId,ownerId,f.execution);expect((await x.lifecycle.markCleaned(executionId,ownerId,rec.execution)).execution.state).toBe("cleaned");});
 it("rejects premature completion",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});await expect(x.lifecycle.complete(executionId,ownerId,r.execution)).rejects.toThrow("transition");});
 it("rejects stale lifecycle tokens",async()=>{const x=fixture();const r=await x.lifecycle.register({executionId,ownerId});await x.lifecycle.start(executionId,ownerId,r.execution);await expect(x.lifecycle.fail(executionId,ownerId,r.execution)).rejects.toThrow("Stale");});
 it("inspects the matching audit head",async()=>{const x=fixture();await x.lifecycle.register({executionId,ownerId});expect((await x.lifecycle.inspect(executionId,ownerId)).audit.sequence).toBe(1);});
 it("rejects wrong owner on inspection",async()=>{const x=fixture();await x.lifecycle.register({executionId,ownerId});await expect(x.lifecycle.inspect(executionId,"owner-0002")).rejects.toThrow("unavailable");});
});

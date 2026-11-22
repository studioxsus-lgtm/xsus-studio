import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {createTransactionalExecutionAudit} from "../../src/xsus-app-build-engine/sandbox/transactional-execution-audit.js";
const id="execution-0001",owner="owner-0001",hash="a".repeat(64);
const digest=async text=>createHash("sha256").update(text).digest("hex");
function fixture({failUpdate=false,failAppend=false}={}){
 let state={executionId:id,ownerId:owner,state:"registered",revision:1,fence:1,updatedAt:10};
 let head={sequence:1,fence:1,to:"registered",hash};
 let events=[];
 const transaction=async work=>{
  let pending={...state},pendingHead={...head},pendingEvents=[...events];
  const result=await work({
   lockExecution:async()=>({...pending}),
   readAuditHead:async()=>({...pendingHead}),
   updateExecution:async(_old,next)=>{if(failUpdate)return false;pending={...next};return true;},
   appendAudit:async(entry,previousHash)=>{if(failAppend||previousHash!==pendingHead.hash)return false;pendingHead={sequence:entry.sequence,fence:entry.fence,to:entry.to,hash:entry.hash};pendingEvents.push(entry);return true;}
  });
  state=pending;head=pendingHead;events=pendingEvents;return result;
 };
 return {service:createTransactionalExecutionAudit({transaction,digest,clock:()=>100}),getState:()=>state,getEvents:()=>events};
}
const args={executionId:id,ownerId:owner,expectedRevision:1,expectedFence:1,to:"running"};
describe("XSUS phase 38 transactional audit coordination",()=>{
 it("requires transactional dependencies",()=>expect(()=>createTransactionalExecutionAudit()).toThrow("dependencies"));
 it("commits state and audit together",async()=>{const x=fixture();const result=await x.service.transition(args);expect(result.execution.state).toBe("running");expect(x.getEvents()).toHaveLength(1);});
 it("advances revision and fence together",async()=>{const x=fixture();const r=await x.service.transition(args);expect(r.execution.revision).toBe(2);expect(r.audit.fence).toBe(2);});
 it("rolls back on audit append failure",async()=>{const x=fixture({failAppend:true});await expect(x.service.transition(args)).rejects.toThrow("audit append");expect(x.getState().state).toBe("registered");expect(x.getEvents()).toHaveLength(0);});
 it("rolls back on execution update failure",async()=>{const x=fixture({failUpdate:true});await expect(x.service.transition(args)).rejects.toThrow("execution update");expect(x.getState().state).toBe("registered");});
 it("rejects stale revision",async()=>await expect(fixture().service.transition({...args,expectedRevision:2})).rejects.toThrow("Stale"));
 it("rejects unauthorized owner",async()=>await expect(fixture().service.transition({...args,ownerId:"owner-0002"})).rejects.toThrow("ownership"));
 it("rejects invalid transition",async()=>await expect(fixture().service.transition({...args,to:"cleaned"})).rejects.toThrow("transition"));
 it("rejects invalid execution IDs",async()=>await expect(fixture().service.transition({...args,executionId:"../bad"})).rejects.toThrow("request"));
 it("rejects missing audit head",async()=>{const service=createTransactionalExecutionAudit({transaction:async work=>work({lockExecution:async()=>({executionId:id,ownerId:owner,state:"registered",revision:1,fence:1}),readAuditHead:async()=>null,updateExecution:async()=>true,appendAudit:async()=>true}),digest});await expect(service.transition(args)).rejects.toThrow("Audit head");});
});

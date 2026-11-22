import {describe,it,expect,vi} from "vitest";
import {createAtomicExecutionRegistration} from "../../src/xsus-app-build-engine/sandbox/atomic-execution-registration.js";
const args={executionId:"execution-0001",ownerId:"owner-0001"};
function setup({failInsert=false,failAudit=false,failCommit=false,failRollback=false}={}){
 const statements=[],release=vi.fn();
 const client={release,query:vi.fn(async(sql,params=[])=>{
  statements.push({sql,params});
  if(sql==="COMMIT"&&failCommit)throw new Error("commit failed");
  if(sql==="ROLLBACK"&&failRollback)throw new Error("rollback failed");
  if(sql.includes("INSERT INTO xsus_internal.build_executions"))return {rows:failInsert?[]:[{execution_id:args.executionId}]};
  if(sql.includes("INSERT INTO xsus_internal.build_execution_audit"))return {rows:failAudit?[]:[{sequence:1}]};
  return {rows:[]};
 })};
 return {service:createAtomicExecutionRegistration({connect:async()=>client,clock:()=>123}),statements,release};
}
describe("XSUS phase 40 atomic execution registration",()=>{
 it("requires database connection",()=>expect(()=>createAtomicExecutionRegistration()).toThrow("connection"));
 it("rejects malformed execution identity",async()=>await expect(setup().service.register({executionId:"../bad",ownerId:args.ownerId})).rejects.toThrow("identity"));
 it("commits execution and first audit together",async()=>{const x=setup();const result=await x.service.register(args);expect(result.execution.state).toBe("registered");expect(result.audit.sequence).toBe(1);expect(x.statements.map(s=>s.sql)).toContain("COMMIT");});
 it("uses zero genesis hash",async()=>{const x=setup();const r=await x.service.register(args);expect(r.audit.previousHash).toBe("0".repeat(64));});
 it("uses consistent timestamps",async()=>{const x=setup();const r=await x.service.register(args);expect(r.audit.timestamp).toBe(r.execution.updatedAt);});
 it("rejects duplicate registration and rolls back",async()=>{const x=setup({failInsert:true});await expect(x.service.register(args)).rejects.toThrow("already registered");expect(x.statements.at(-1).sql).toBe("ROLLBACK");});
 it("rolls back on audit insertion failure",async()=>{const x=setup({failAudit:true});await expect(x.service.register(args)).rejects.toThrow("audit insertion");expect(x.statements.at(-1).sql).toBe("ROLLBACK");});
 it("rolls back when COMMIT fails",async()=>{const x=setup({failCommit:true});await expect(x.service.register(args)).rejects.toThrow("commit failed");expect(x.statements.at(-1).sql).toBe("ROLLBACK");});
 it("releases the client on success and failure",async()=>{const a=setup(),b=setup({failAudit:true});await a.service.register(args);await expect(b.service.register(args)).rejects.toThrow();expect(a.release).toHaveBeenCalledOnce();expect(b.release).toHaveBeenCalledOnce();});
 it("reports rollback failures",async()=>{const x=setup({failAudit:true,failRollback:true});await expect(x.service.register(args)).rejects.toThrow("Registration and rollback failed");});
});

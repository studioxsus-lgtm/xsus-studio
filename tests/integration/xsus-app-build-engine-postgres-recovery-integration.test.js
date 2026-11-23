import {describe,it,expect,vi} from "vitest";
import {createPostgresRecoveryIntegration} from "../../src/xsus-app-build-engine/sandbox/postgres-recovery-integration.js";
const executionId="execution-0001",operationId="operation-0001";
const input={executionId,operationId,reason:"timeout",stopRequested:true};
function setup(){
 const data=new Map(),calls=[];
 const query=vi.fn(async(sql,params)=>{
  calls.push({sql,params});
  const key=params[0]+":"+params[1],existing=data.get(key);
  if(sql.startsWith("SELECT"))return {rows:existing?[existing]:[]};
  if(sql.startsWith("INSERT")){if(existing)return {rows:[]};const row={execution_id:params[0],operation_id:params[1],reason:params[2],stop_requested:params[3],status:params[4],revision:String(params[5]),reviewer_id:null,evidence_id:null};data.set(key,row);return {rows:[row]};}
  if(sql.startsWith("UPDATE")){if(!existing||existing.reason!==params[2]||existing.stop_requested!==params[3]||existing.status!==params[4]||Number(existing.revision)!==params[5])return {rows:[]};const row={...existing,status:params[6],revision:String(params[7]),reviewer_id:params[8],evidence_id:params[9]};data.set(key,row);return {rows:[row]};}
  throw new Error("Unexpected SQL");
 });
 const authorizeReview=vi.fn(async()=>true);
 return {api:createPostgresRecoveryIntegration({query,authorizeReview}),query,authorizeReview,data,calls};
}
describe("XSUS phase 61 PostgreSQL recovery integration",()=>{
 it("requires trusted dependencies",()=>expect(()=>createPostgresRecoveryIntegration()).toThrow("Trusted"));
 it("records and reads an uncertain receipt",async()=>{const x=setup();await x.api.recordUncertain(input);expect(await x.api.inspect({executionId,operationId})).toMatchObject({...input,status:"uncertain"});});
 it("preserves duplicate idempotency",async()=>{const x=setup();await x.api.recordUncertain(input);await x.api.recordUncertain(input);expect(x.calls.filter(x=>x.sql.startsWith("INSERT"))).toHaveLength(1);});
 it("rejects conflicting reasons",async()=>{const x=setup();await x.api.recordUncertain(input);await expect(x.api.recordUncertain({...input,reason:"lock-lost"})).rejects.toThrow("conflict");});
 it("requires authorized review",async()=>{const x=setup();await x.api.recordUncertain(input);x.authorizeReview.mockResolvedValue(false);await expect(x.api.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("unauthorized");});
 it("reviews with conditional SQL",async()=>{const x=setup();await x.api.recordUncertain(input);expect(await x.api.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).toMatchObject({status:"reviewed",revision:2});expect(x.calls.some(x=>x.sql.includes("WHERE execution_id=$1")&&x.sql.startsWith("UPDATE"))).toBe(true);});
 it("prevents repeat review",async()=>{const x=setup();await x.api.recordUncertain(input);const args={executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"};await x.api.markReviewed(args);await expect(x.api.markReviewed(args)).rejects.toThrow("not reviewable");});
 it("does not expose untrusted SQL fragments",async()=>{const x=setup();await x.api.recordUncertain(input);expect(x.calls.every(c=>c.sql.includes("xsus_internal.build_cancellation_receipts"))).toBe(true);});
});

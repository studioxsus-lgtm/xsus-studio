import {describe,it,expect,vi} from "vitest";
import {createPostgresCancellationRecoveryStore} from "../../src/xsus-app-build-engine/sandbox/postgres-cancellation-recovery-store.js";
const r={executionId:"execution-0001",operationId:"operation-0001",reason:"timeout",stopRequested:true,status:"uncertain",revision:1};
const row=(x=r)=>({execution_id:x.executionId,operation_id:x.operationId,reason:x.reason,stop_requested:x.stopRequested,status:x.status,revision:String(x.revision),reviewer_id:x.reviewerId??null,evidence_id:x.evidenceId??null});
const setup=(found=[])=>{const query=vi.fn(async()=>({rows:found}));return {store:createPostgresCancellationRecoveryStore({query}),query};};
describe("XSUS phase 60 PostgreSQL cancellation recovery store",()=>{
 it("requires query",()=>expect(()=>createPostgresCancellationRecoveryStore()).toThrow("query"));
 it("reads receipt",async()=>expect(await setup([row()]).store.read(r.executionId,r.operationId)).toEqual(r));
 it("returns null when absent",async()=>expect(await setup().store.read(r.executionId,r.operationId)).toBeNull());
 it("rejects mismatched identity",async()=>await expect(setup([row({...r,operationId:"operation-0002"})]).store.read(r.executionId,r.operationId)).rejects.toThrow("mismatch"));
 it("inserts initial receipt",async()=>expect(await setup([row()]).store.createIfAbsent(r)).toBe(true));
 it("reports duplicate receipt",async()=>expect(await setup().store.createIfAbsent(r)).toBe(false));
 it("rejects reviewed insertion",async()=>await expect(setup().store.createIfAbsent({...r,status:"reviewed",reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("initial"));
 it("reviews with CAS",async()=>{const next={...r,status:"reviewed",revision:2,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"};expect(await setup([row(next)]).store.compareAndSwap(r,next)).toBe(true);});
 it("detects lost CAS",async()=>{const next={...r,status:"reviewed",revision:2,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"};expect(await setup().store.compareAndSwap(r,next)).toBe(false);});
 it("rejects invalid revision transition",async()=>await expect(setup().store.compareAndSwap(r,{...r,status:"reviewed",revision:3,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("transition"));
 it("rejects unsafe database revision",async()=>await expect(setup([row({...r,revision:"9007199254740993"})]).store.read(r.executionId,r.operationId)).rejects.toThrow("revision"));
 it("uses parameterized read",async()=>{const x=setup();await x.store.read(r.executionId,r.operationId);expect(x.query.mock.calls[0][1]).toEqual([r.executionId,r.operationId]);});
});

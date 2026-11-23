import {describe,it,expect,vi} from "vitest";
import {createDurableCancellationRecovery} from "../../src/xsus-app-build-engine/sandbox/durable-cancellation-recovery.js";
const executionId="execution-0001",operationId="operation-0001";
const receipt={executionId,operationId,reason:"timeout",stopRequested:true};
function setup(){const records=new Map(),key=(e,o)=>e+":"+o;const store={read:vi.fn(async(e,o)=>records.get(key(e,o))??null),createIfAbsent:vi.fn(async r=>{const k=key(r.executionId,r.operationId);if(records.has(k))return false;records.set(k,{...r});return true;}),compareAndSwap:vi.fn(async(a,b)=>{const k=key(a.executionId,a.operationId);if(JSON.stringify(records.get(k))!==JSON.stringify(a))return false;records.set(k,{...b});return true;})};const authorizeReview=vi.fn(async()=>true);return {recovery:createDurableCancellationRecovery({store,authorizeReview}),store,authorizeReview,records};}
describe("XSUS phase 59 durable cancellation recovery",()=>{
 it("requires trusted store",()=>expect(()=>createDurableCancellationRecovery()).toThrow("dependencies"));
 it("persists uncertain receipt",async()=>expect(await setup().recovery.recordUncertain(receipt)).toMatchObject({...receipt,status:"uncertain",revision:1}));
 it("returns idempotent receipt",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);expect(await x.recovery.recordUncertain(receipt)).toMatchObject(receipt);expect(x.store.createIfAbsent).toHaveBeenCalledOnce();});
 it("rejects conflicting cancellation receipt",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);await expect(x.recovery.recordUncertain({...receipt,reason:"lock-lost"})).rejects.toThrow("conflict");});
 it("inspects persisted receipt",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);expect(await x.recovery.inspect({executionId,operationId})).toMatchObject(receipt);});
 it("returns null for unknown receipt",async()=>expect(await setup().recovery.inspect({executionId,operationId})).toBeNull());
 it("rejects malformed receipt",async()=>await expect(setup().recovery.recordUncertain({...receipt,reason:"success"})).rejects.toThrow("Invalid"));
 it("requires review authorization",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);x.authorizeReview.mockResolvedValue(false);await expect(x.recovery.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("unauthorized");});
 it("marks reviewed only after authorization",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);expect(await x.recovery.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).toMatchObject({status:"reviewed",revision:2});});
 it("rejects repeat review",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);const args={executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"};await x.recovery.markReviewed(args);await expect(x.recovery.markReviewed(args)).rejects.toThrow("not reviewable");});
 it("rejects missing receipt review",async()=>await expect(setup().recovery.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("not found"));
 it("rejects CAS conflict",async()=>{const x=setup();await x.recovery.recordUncertain(receipt);x.store.compareAndSwap.mockResolvedValue(false);await expect(x.recovery.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("conflict");});
});

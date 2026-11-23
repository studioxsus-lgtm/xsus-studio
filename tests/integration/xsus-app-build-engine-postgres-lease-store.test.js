import {describe,it,expect,vi} from "vitest";
import {createPostgresLeaseStore} from "../../src/xsus-app-build-engine/sandbox/postgres-lease-store.js";
const executionId="execution-0001",holderId="worker-0001";
const current={executionId,holderId,fence:1,expiresAt:150};
function setup(responder=async()=>({rows:[]})){const query=vi.fn(responder);return {store:createPostgresLeaseStore({query}),query};}
describe("XSUS phase 45 PostgreSQL lease store",()=>{
 it("requires trusted query",()=>expect(()=>createPostgresLeaseStore()).toThrow("query"));
 it("reads an existing lease",async()=>{const x=setup(async()=>({rows:[{execution_id:executionId,holder_id:holderId,fence:"1",expires_at_ms:"150"}]}));expect(await x.store.read(executionId)).toEqual(current);});
 it("returns null for missing lease",async()=>expect(await setup().store.read(executionId)).toBeNull());
 it("rejects unsafe database integers",async()=>{const x=setup(async()=>({rows:[{execution_id:executionId,holder_id:holderId,fence:"9007199254740993",expires_at_ms:"150"}]}));await expect(x.store.read(executionId)).rejects.toThrow("integer");});
 it("inserts with conflict protection",async()=>{const x=setup(async()=>({rows:[{execution_id:executionId}]}));expect(await x.store.createIfAbsent(executionId,current)).toBe(true);expect(x.query.mock.calls[0][0]).toContain("ON CONFLICT");});
 it("rejects initial lease with noninitial fence",async()=>await expect(setup().store.createIfAbsent(executionId,{...current,fence:2})).rejects.toThrow("initial"));
 it("returns false on competing insert",async()=>expect(await setup().store.createIfAbsent(executionId,current)).toBe(false));
 it("CAS compares owner, fence and expiration",async()=>{const x=setup(async()=>({rows:[{execution_id:executionId}]}));expect(await x.store.compareAndSwap(executionId,current,{...current,expiresAt:160})).toBe(true);expect(x.query.mock.calls[0][0]).toContain("AND expires_at_ms=$4");});
 it("allows increasing fence on takeover",async()=>{const x=setup(async()=>({rows:[{execution_id:executionId}]}));expect(await x.store.compareAndSwap(executionId,current,{...current,holderId:"worker-0002",fence:2,expiresAt:200})).toBe(true);});
 it("returns false for stale CAS",async()=>expect(await setup().store.compareAndSwap(executionId,current,{...current,expiresAt:160})).toBe(false));
 it("rejects fence regression",async()=>await expect(setup().store.compareAndSwap(executionId,{...current,fence:2},{...current,fence:1})).rejects.toThrow("fencing"));
 it("rejects unsafe execution ID",async()=>await expect(setup().store.read("../bad")).rejects.toThrow("ID"));
});

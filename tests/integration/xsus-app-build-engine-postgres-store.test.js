import {describe,it,expect,vi} from "vitest";
import {createPostgresExecutionStore} from "../../src/xsus-app-build-engine/sandbox/postgres-execution-store.js";
const record={executionId:"execution-0001",ownerId:"owner-0001",state:"registered",revision:1,fence:1,updatedAt:123};
describe("XSUS phase 35 PostgreSQL execution store",()=>{
 it("requires a query adapter",()=>expect(()=>createPostgresExecutionStore()).toThrow("adapter"));
 it("inserts initial record with SQL parameters",async()=>{const query=vi.fn(async()=>({rows:[{execution_id:record.executionId}]}));expect(await createPostgresExecutionStore({query}).createIfAbsent(record.executionId,record)).toBe(true);expect(query.mock.calls[0][1]).toEqual([record.executionId,record.ownerId,"registered",1,1,123]);});
 it("handles existing execution",async()=>expect(await createPostgresExecutionStore({query:async()=>({rows:[]})}).createIfAbsent(record.executionId,record)).toBe(false));
 it("rejects invalid initial revision",async()=>await expect(createPostgresExecutionStore({query:async()=>({rows:[]})}).createIfAbsent(record.executionId,{...record,revision:2})).rejects.toThrow("initial"));
 it("returns null for unknown execution",async()=>expect(await createPostgresExecutionStore({query:async()=>({rows:[]})}).read(record.executionId)).toBe(null));
 it("parses persisted records",async()=>expect(await createPostgresExecutionStore({query:async()=>({rows:[{execution_id:record.executionId,owner_id:record.ownerId,state:"registered",revision:"1",fence:"1",updated_at_ms:"123"}]})}).read(record.executionId)).toEqual(record));
 it("refuses invalid persisted records",async()=>await expect(createPostgresExecutionStore({query:async()=>({rows:[{execution_id:"bad"}]})}).read(record.executionId)).rejects.toThrow("record"));
 it("uses atomic conditional UPDATE",async()=>{const query=vi.fn(async()=>({rows:[{execution_id:record.executionId}]}));const next={...record,state:"running",revision:2,fence:2};expect(await createPostgresExecutionStore({query}).compareAndSwap(record.executionId,1,1,next)).toBe(true);expect(query.mock.calls[0][0]).toContain("AND fence=$8");});
 it("rejects stale CAS updates",async()=>expect(await createPostgresExecutionStore({query:async()=>({rows:[]})}).compareAndSwap(record.executionId,1,1,{...record,state:"running",revision:2,fence:2})).toBe(false));
 it("rejects malformed database responses",async()=>await expect(createPostgresExecutionStore({query:async()=>({})}).read(record.executionId)).rejects.toThrow("response"));
});

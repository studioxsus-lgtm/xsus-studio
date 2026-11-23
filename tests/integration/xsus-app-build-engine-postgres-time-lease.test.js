import {describe,it,expect,vi} from "vitest";
import {createPostgresTimeLeaseManager} from "../../src/xsus-app-build-engine/sandbox/postgres-time-lease-manager.js";
const executionId="execution-0001",holderId="worker-0001",fence=3;
const lease={execution_id:executionId,holder_id:holderId,fence:"3",expires_at_ms:"300"};
function setup(rows=[lease]){const query=vi.fn(async()=>({rows}));return {manager:createPostgresTimeLeaseManager({query}),query};}
describe("XSUS phase 47 PostgreSQL-time lease acquisition",()=>{
 it("requires trusted query",()=>expect(()=>createPostgresTimeLeaseManager()).toThrow("query"));
 it("acquires with atomic upsert",async()=>{const x=setup();await x.manager.acquire({executionId,holderId,durationMs:500});expect(x.query.mock.calls[0][0]).toContain("ON CONFLICT");});
 it("uses PostgreSQL clock on acquisition",async()=>{const x=setup();await x.manager.acquire({executionId,holderId,durationMs:500});expect(x.query.mock.calls[0][0]).toContain("clock_timestamp()");});
 it("binds acquisition values",async()=>{const x=setup();await x.manager.acquire({executionId,holderId,durationMs:500});expect(x.query.mock.calls[0][1]).toEqual([executionId,holderId,500]);});
 it("rejects competing acquisition",async()=>await expect(setup([]).manager.acquire({executionId,holderId,durationMs:500})).rejects.toThrow("held"));
 it("renews using database time and fence",async()=>{const x=setup();await x.manager.renew({executionId,holderId,fence,durationMs:500});expect(x.query.mock.calls[0][0]).toContain("GREATEST");expect(x.query.mock.calls[0][1]).toEqual([executionId,holderId,fence,500]);});
 it("rejects expired renewal",async()=>await expect(setup([]).manager.renew({executionId,holderId,fence,durationMs:500})).rejects.toThrow("expired"));
 it("rejects stale renewal identity",async()=>await expect(setup([{...lease,fence:"4"}]).manager.renew({executionId,holderId,fence,durationMs:500})).rejects.toThrow("mismatch"));
 it("releases only matching fence",async()=>{const x=setup([{...lease,expires_at_ms:"0"}]);expect(await x.manager.release({executionId,holderId,fence})).toBe(true);});
 it("rejects stale release",async()=>await expect(setup([]).manager.release({executionId,holderId,fence})).rejects.toThrow("ownership"));
 it("rejects invalid duration",async()=>await expect(setup().manager.acquire({executionId,holderId,durationMs:300001})).rejects.toThrow("acquisition"));
 it("rejects unsafe integers",async()=>await expect(setup([{...lease,fence:"9007199254740993"}]).manager.acquire({executionId,holderId,durationMs:500})).rejects.toThrow("integer"));
});

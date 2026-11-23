import {describe,it,expect,vi} from "vitest";
import {createPostgresSessionHealthMonitor} from "../../src/xsus-app-build-engine/sandbox/postgres-session-health-monitor.js";
const executionId="execution-0001";
function setup({pid=123,acquired=true,unlocked=true,fail=false}={}){
 const onLost=vi.fn();
 const client={query:vi.fn(async sql=>{if(fail)throw new Error("connection lost");return sql.includes("pg_advisory_unlock")?{rows:[{unlocked}]}:{rows:[{pid,acquired}]};})};
 return {monitor:createPostgresSessionHealthMonitor({client,executionId,expectedPid:123,onLost}),client,onLost};
}
describe("XSUS phase 55 PostgreSQL pinned-session health probe",()=>{
 it("requires pinned session dependencies",()=>expect(()=>createPostgresSessionHealthMonitor()).toThrow("dependencies"));
 it("verifies pinned backend and lock probe",async()=>expect(await setup().monitor.verify()).toBe(true));
 it("balances reentrant advisory acquisition",async()=>{const x=setup();await x.monitor.verify();expect(x.client.query).toHaveBeenCalledTimes(2);});
 it("uses parameterized lock key",async()=>{const x=setup();await x.monitor.verify();expect(x.client.query.mock.calls[0][1]).toEqual(["xsus-host:"+executionId]);});
 it("rejects changed backend",async()=>{const x=setup({pid:124});expect(await x.monitor.verify()).toBe(false);expect(x.onLost).toHaveBeenCalledOnce();});
 it("rejects missing lock",async()=>{const x=setup({acquired:false});expect(await x.monitor.verify()).toBe(false);});
 it("rejects connection failure",async()=>{const x=setup({fail:true});expect(await x.monitor.verify()).toBe(false);expect(x.monitor.lost).toBe(true);});
 it("rejects unverified unlock",async()=>expect(await setup({unlocked:false}).monitor.verify()).toBe(false));
 it("stays failed closed after loss",async()=>{const x=setup({fail:true});await x.monitor.verify();await x.monitor.verify();expect(x.onLost).toHaveBeenCalledOnce();});
 it("does not query after close",async()=>{const x=setup();await x.monitor.close();expect(await x.monitor.verify()).toBe(false);expect(x.client.query).not.toHaveBeenCalled();});
 it("rejects invalid execution ID",()=>expect(()=>createPostgresSessionHealthMonitor({client:{query:async()=>{}},executionId:"../bad",expectedPid:123,onLost:()=>{}})).toThrow("dependencies"));
 it("rejects malformed backend PID",async()=>expect(await setup({pid:"bad"}).monitor.verify()).toBe(false));
});

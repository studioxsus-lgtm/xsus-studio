import {describe,it,expect,vi} from "vitest";
import {createPostgresHostLockCoordinator} from "../../src/xsus-app-build-engine/sandbox/postgres-host-lock-coordinator.js";
const executionId="execution-0001";
function setup({unlock=true,failLock=false,failRelease=false}={}){
 const trace=[];
 const client={query:vi.fn(async(sql,params)=>{trace.push(sql.includes("pg_advisory_unlock")?"unlock":"lock");if(failLock&&sql.includes("pg_advisory_lock("))throw new Error("lock failed");return sql.includes("pg_advisory_unlock")?{rows:[{unlocked:unlock}]}:{rows:[{}]};}),release:vi.fn(async()=>{trace.push("release");if(failRelease)throw new Error("release failed");})};
 const connect=vi.fn(async()=>client);
 return {lock:createPostgresHostLockCoordinator({connect}),client,trace,connect};
}
describe("XSUS phase 53 PostgreSQL host lock coordinator",()=>{
 it("requires connection factory",()=>expect(()=>createPostgresHostLockCoordinator()).toThrow("factory"));
 it("locks before callback and unlocks after",async()=>{const x=setup();expect(await x.lock.withExclusiveExecutionLock(executionId,async()=>{x.trace.push("action");return 7;})).toBe(7);expect(x.trace).toEqual(["lock","action","unlock","release"]);});
 it("uses same key for lock and unlock",async()=>{const x=setup();await x.lock.withExclusiveExecutionLock(executionId,async()=>{});expect(x.client.query.mock.calls[0][1]).toEqual(x.client.query.mock.calls[1][1]);});
 it("uses dedicated connection",async()=>{const x=setup();await x.lock.withExclusiveExecutionLock(executionId,async()=>{});expect(x.connect).toHaveBeenCalledOnce();});
 it("releases lock after callback error",async()=>{const x=setup();await expect(x.lock.withExclusiveExecutionLock(executionId,async()=>{throw new Error("action failed");})).rejects.toThrow("action failed");expect(x.trace).toEqual(["lock","unlock","release"]);});
 it("does not unlock if acquisition failed",async()=>{const x=setup({failLock:true});await expect(x.lock.withExclusiveExecutionLock(executionId,async()=>{})).rejects.toThrow("lock failed");expect(x.trace).toEqual(["lock","release"]);});
 it("rejects unlock false",async()=>await expect(setup({unlock:false}).lock.withExclusiveExecutionLock(executionId,async()=>{})).rejects.toThrow("unverified"));
 it("rejects release error",async()=>await expect(setup({failRelease:true}).lock.withExclusiveExecutionLock(executionId,async()=>{})).rejects.toThrow("release failed"));
 it("rejects malformed execution ID",async()=>await expect(setup().lock.withExclusiveExecutionLock("../bad",async()=>{})).rejects.toThrow("Invalid"));
 it("rejects nonfunction callback",async()=>await expect(setup().lock.withExclusiveExecutionLock(executionId,null)).rejects.toThrow("Invalid"));
 it("uses parameterized advisory lock",async()=>{const x=setup();await x.lock.withExclusiveExecutionLock(executionId,async()=>{});expect(x.client.query.mock.calls[0][0]).toContain("$1::text");});
 it("returns callback result",async()=>expect(await setup().lock.withExclusiveExecutionLock(executionId,async()=>({ok:true}))).toEqual({ok:true}));
});

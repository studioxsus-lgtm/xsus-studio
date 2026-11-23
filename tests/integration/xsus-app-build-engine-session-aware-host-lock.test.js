import {describe,it,expect,vi} from "vitest";
import {createSessionAwareHostLock} from "../../src/xsus-app-build-engine/sandbox/session-aware-host-lock.js";
const id="execution-0001";
function setup({probePid=123,probeAcquired=true,unlock=true,failFinalUnlock=false,failProbe=false}={}){
 const trace=[];let unlockCount=0;
 const client={query:vi.fn(async sql=>{
  if(sql.includes("pg_backend_pid()")&&!sql.includes("pg_try_advisory_lock")){trace.push("pid");return {rows:[{pid:123}]};}
  if(sql.includes("pg_advisory_lock(")){trace.push("lock");return {rows:[{}]};}
  if(sql.includes("pg_try_advisory_lock")){trace.push("probe");if(failProbe)throw new Error("disconnected");return {rows:[{pid:probePid,acquired:probeAcquired}]};}
  if(sql.includes("pg_advisory_unlock")){trace.push("unlock");unlockCount++;return {rows:[{unlocked:unlock&&!(failFinalUnlock&&unlockCount===3)}]};}
  throw new Error("Unexpected SQL");
 }),release:vi.fn(async()=>{trace.push("release");})};
 const connect=vi.fn(async()=>client);
 return {lock:createSessionAwareHostLock({connect}),client,trace,connect};
}
describe("XSUS phase 56 session-aware host lock",()=>{
 it("requires trusted connection",()=>expect(()=>createSessionAwareHostLock()).toThrow("factory"));
 it("uses same pinned session through callback",async()=>{const x=setup();expect(await x.lock.withExclusiveExecutionLock(id,async()=>{x.trace.push("action");return 7;})).toBe(7);expect(x.trace).toEqual(["pid","lock","probe","unlock","action","probe","unlock","unlock","release"]);});
 it("passes cancellation signal",async()=>{const x=setup();await x.lock.withExclusiveExecutionLock(id,async({signal})=>expect(signal.aborted).toBe(false));});
 it("rejects changed backend PID",async()=>await expect(setup({probePid:124}).lock.withExclusiveExecutionLock(id,async()=>{})).rejects.toThrow("unverified"));
 it("rejects lost advisory lock probe",async()=>await expect(setup({probeAcquired:false}).lock.withExclusiveExecutionLock(id,async()=>{})).rejects.toThrow("unverified"));
 it("rejects probe connection failure",async()=>await expect(setup({failProbe:true}).lock.withExclusiveExecutionLock(id,async()=>{})).rejects.toThrow("unverified"));
 it("releases connection on callback failure",async()=>{const x=setup();await expect(x.lock.withExclusiveExecutionLock(id,async()=>{throw new Error("action failed");})).rejects.toThrow("action failed");expect(x.client.release).toHaveBeenCalledOnce();});
 it("rejects failed unlock",async()=>await expect(setup({failFinalUnlock:true}).lock.withExclusiveExecutionLock(id,async()=>{})).rejects.toThrow("unlock"));
 it("rejects invalid execution ID",async()=>await expect(setup().lock.withExclusiveExecutionLock("../bad",async()=>{})).rejects.toThrow("Invalid"));
 it("rejects invalid callback",async()=>await expect(setup().lock.withExclusiveExecutionLock(id,null)).rejects.toThrow("Invalid"));
 it("uses parameterized advisory key",async()=>{const x=setup();await x.lock.withExclusiveExecutionLock(id,async()=>{});expect(x.client.query.mock.calls[1][1]).toEqual(["xsus-host:"+id]);});
 it("does not invoke callback if probe fails",async()=>{const x=setup({probeAcquired:false}),callback=vi.fn();await expect(x.lock.withExclusiveExecutionLock(id,callback)).rejects.toThrow("unverified");expect(callback).not.toHaveBeenCalled();});
});

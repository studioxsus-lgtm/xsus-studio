import {describe,it,expect} from "vitest";
import {createDurableLeaseManager} from "../../src/xsus-app-build-engine/sandbox/durable-lease-manager.js";
const executionId="execution-0001",holderId="worker-0001";
function setup(){let time=100;const records=new Map();const store={read:async id=>records.get(id)??null,createIfAbsent:async(id,next)=>{if(records.has(id))return false;records.set(id,next);return true;},compareAndSwap:async(id,old,next)=>{if(records.get(id)!==old)return false;records.set(id,next);return true;}};return {manager:createDurableLeaseManager({store,clock:()=>time}),setTime:n=>{time=n;},records,store};}
const args={executionId,holderId,durationMs:50};
describe("XSUS phase 44 durable lease and fencing contracts",()=>{
 it("requires durable store",()=>expect(()=>createDurableLeaseManager()).toThrow("dependencies"));
 it("acquires first lease with fence one",async()=>expect((await setup().manager.acquire(args)).fence).toBe(1));
 it("prevents simultaneous active lease acquisition",async()=>{const x=setup();await x.manager.acquire(args);await expect(x.manager.acquire({...args,holderId:"worker-0002"})).rejects.toThrow("held");});
 it("renews only active matching owner",async()=>{const x=setup();await x.manager.acquire(args);expect((await x.manager.renew({...args,fence:1})).expiresAt).toBe(150);});
 it("rejects wrong renewal fence",async()=>{const x=setup();await x.manager.acquire(args);await expect(x.manager.renew({...args,fence:2})).rejects.toThrow("ownership");});
 it("expires lease and increments fence on takeover",async()=>{const x=setup();await x.manager.acquire(args);x.setTime(151);expect((await x.manager.acquire({...args,holderId:"worker-0002"})).fence).toBe(2);});
 it("rejects stale holder after takeover",async()=>{const x=setup();await x.manager.acquire(args);x.setTime(151);await x.manager.acquire({...args,holderId:"worker-0002"});expect(await x.manager.verify({...args,fence:1})).toBe(false);});
 it("releases only matching lease",async()=>{const x=setup();await x.manager.acquire(args);await x.manager.release({...args,fence:1});expect(await x.manager.verify({...args,fence:1})).toBe(false);});
 it("increments fence after release",async()=>{const x=setup();await x.manager.acquire(args);await x.manager.release({...args,fence:1});expect((await x.manager.acquire(args)).fence).toBe(2);});
 it("rejects invalid identifiers",async()=>await expect(setup().manager.acquire({...args,executionId:"../bad"})).rejects.toThrow("request"));
 it("rejects oversized lease durations",async()=>await expect(setup().manager.acquire({...args,durationMs:300001})).rejects.toThrow("request"));
});

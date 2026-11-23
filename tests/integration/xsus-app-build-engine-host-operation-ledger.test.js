import {describe,it,expect,vi} from "vitest";
import {createDurableHostOperationLedger} from "../../src/xsus-app-build-engine/sandbox/durable-host-operation-ledger.js";
const args={executionId:"execution-0001",operationId:"operation-0001",holderId:"worker-0001",fence:2,operation:"launch"};
function setup(){const records=new Map();const key=(e,o)=>e+":"+o;const store={
 read:vi.fn(async(e,o)=>records.get(key(e,o))??null),
 createIfAbsent:vi.fn(async r=>{const k=key(r.executionId,r.operationId);if(records.has(k))return false;records.set(k,r);return true;}),
 compareAndSwap:vi.fn(async(old,next)=>{const k=key(old.executionId,old.operationId);if(records.get(k)!==old)return false;records.set(k,next);return true;})
 };const withExclusiveExecutionLock=vi.fn(async(_id,fn)=>fn());return {ledger:createDurableHostOperationLedger({store,withExclusiveExecutionLock}),store,records};}
describe("XSUS phase 50 durable host operation ledger",()=>{
 it("requires durable dependencies",()=>expect(()=>createDurableHostOperationLedger()).toThrow("dependencies"));
 it("records a confirmed action",async()=>{const x=setup();const r=await x.ledger.execute({...args,performAction:async()=>({applied:true})});expect(r.status).toBe("applied");expect((await x.ledger.inspect(args)).status).toBe("applied");});
 it("does not execute an already applied operation twice",async()=>{const x=setup(),performAction=vi.fn(async()=>({applied:true}));await x.ledger.execute({...args,performAction});expect((await x.ledger.execute({...args,performAction})).status).toBe("already-applied");expect(performAction).toHaveBeenCalledOnce();});
 it("refuses pending operation replay",async()=>{const x=setup();x.records.set(args.executionId+":"+args.operationId,{...args,status:"pending"});await expect(x.ledger.execute({...args,performAction:vi.fn()})).rejects.toThrow("reconciliation");});
 it("refuses uncertain operation replay",async()=>{const x=setup();x.records.set(args.executionId+":"+args.operationId,{...args,status:"uncertain"});await expect(x.ledger.execute({...args,performAction:vi.fn()})).rejects.toThrow("reconciliation");});
 it("marks thrown action uncertain",async()=>{const x=setup();await expect(x.ledger.execute({...args,performAction:async()=>{throw new Error("host crash");}})).rejects.toThrow("host crash");expect((await x.ledger.inspect(args)).status).toBe("uncertain");});
 it("marks unconfirmed action uncertain",async()=>{const x=setup();await expect(x.ledger.execute({...args,performAction:async()=>({applied:false})})).rejects.toThrow("unconfirmed");expect((await x.ledger.inspect(args)).status).toBe("uncertain");});
 it("rejects conflicting reuse of operation ID",async()=>{const x=setup();await x.ledger.execute({...args,performAction:async()=>({applied:true})});await expect(x.ledger.execute({...args,fence:3,performAction:async()=>({applied:true})})).rejects.toThrow("conflict");});
 it("returns null for missing operation",async()=>expect(await setup().ledger.inspect(args)).toBeNull());
 it("rejects invalid operation ID",async()=>await expect(setup().ledger.inspect({...args,operationId:"../bad"})).rejects.toThrow("identity"));
 it("rejects unsupported action",async()=>await expect(setup().ledger.execute({...args,operation:"shell",performAction:async()=>({applied:true})})).rejects.toThrow("request"));
 it("does not run physical action if registration conflicts",async()=>{const x=setup(),action=vi.fn();x.store.createIfAbsent.mockResolvedValue(false);await expect(x.ledger.execute({...args,performAction:action})).rejects.toThrow("Concurrent");expect(action).not.toHaveBeenCalled();});
});

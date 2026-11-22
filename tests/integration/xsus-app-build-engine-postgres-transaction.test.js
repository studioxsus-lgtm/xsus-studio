import {describe,it,expect,vi} from "vitest";
import {createPostgresTransactionProvider} from "../../src/xsus-app-build-engine/sandbox/postgres-transaction-provider.js";
const id="execution-0001",owner="owner-0001",hash="a".repeat(64);
function setup(handler=async(sql)=>({rows:sql.startsWith("SELECT")?[{execution_id:id,owner_id:owner,state:"registered",revision:"1",fence:"1",updated_at_ms:"1",sequence:"1",to_state:"registered",hash}]:sql.includes("RETURNING")?[{execution_id:id,sequence:2}]:[]})){
 const queries=[],release=vi.fn();
 const client={query:vi.fn(async(sql,args)=>{queries.push(sql);return handler(sql,args);}),release};
 return {provider:createPostgresTransactionProvider({connect:async()=>client}),queries,release};
}
describe("XSUS phase 39 PostgreSQL transaction provider contract",()=>{
 it("requires dedicated connection provider",()=>expect(()=>createPostgresTransactionProvider()).toThrow("connection"));
 it("commits successful transaction",async()=>{const x=setup();await x.provider(async()=>true);expect(x.queries).toEqual(["BEGIN","COMMIT"]);expect(x.release).toHaveBeenCalledOnce();});
 it("rolls back thrown transaction",async()=>{const x=setup();await expect(x.provider(async()=>{throw new Error("failed");})).rejects.toThrow("failed");expect(x.queries).toEqual(["BEGIN","ROLLBACK"]);});
 it("releases client after rollback",async()=>{const x=setup();await expect(x.provider(async()=>{throw new Error("failed");})).rejects.toThrow();expect(x.release).toHaveBeenCalledOnce();});
 it("locks execution row",async()=>{const x=setup();await x.provider(async tx=>expect((await tx.lockExecution(id)).ownerId).toBe(owner));expect(x.queries.some(q=>q.includes("FOR UPDATE"))).toBe(true);});
 it("reads audit head",async()=>{const x=setup();await x.provider(async tx=>expect((await tx.readAuditHead(id)).hash).toBe(hash));});
 it("rejects unsafe IDs",async()=>{const x=setup();await expect(x.provider(tx=>tx.lockExecution("../bad"))).rejects.toThrow("ID");expect(x.queries).toContain("ROLLBACK");});
 it("uses conditional state update",async()=>{const x=setup();await x.provider(tx=>tx.updateExecution({executionId:id,ownerId:owner,revision:1,fence:1},{executionId:id,ownerId:owner,state:"running",revision:2,fence:2,updatedAt:2}));expect(x.queries.some(q=>q.includes("AND fence=$8"))).toBe(true);});
 it("appends audit with prior-head condition",async()=>{const x=setup();await x.provider(tx=>tx.appendAudit({executionId:id,sequence:2,revision:2,fence:2,from:"registered",to:"running",timestamp:2,previousHash:hash,hash:"b".repeat(64),version:"0.1.0"},hash));expect(x.queries.some(q=>q.includes("WHERE EXISTS"))).toBe(true);});
 it("propagates rollback failure",async()=>{const x=setup(async sql=>{if(sql==="ROLLBACK")throw new Error("rollback failed");return {rows:[]};});await expect(x.provider(async()=>{throw new Error("original");})).rejects.toThrow("Transaction and rollback failed");});
});

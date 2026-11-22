import {describe,it,expect} from "vitest";
import {createDatabaseSchema} from "../../src/xsus-app-build-engine/backend/schema-engine.js";
import {assertAuthenticatedActor} from "../../src/xsus-app-build-engine/backend/auth-contract.js";
const schema={tables:[{name:"tasks",columns:[{name:"title",type:"text",required:true},{name:"done",type:"boolean"}]}]};
describe("XSUS backend and database schema engine",()=>{
  it("generates reviewed SQL with owner policies",()=>{const result=createDatabaseSchema(schema);expect(result.requiresReview).toBe(true);expect(result.sql).toContain("FORCE ROW LEVEL SECURITY");expect(result.sql).toContain("TO authenticated");expect(result.sql).toContain("WITH CHECK ((select auth.uid()) = owner_id)");});
  it("rejects SQL injection through identifiers",()=>{expect(()=>createDatabaseSchema({tables:[{name:"tasks;drop",columns:[{name:"title",type:"text"}]}]})).toThrow("identifier");});
  it("rejects duplicate tables",()=>{expect(()=>createDatabaseSchema({tables:[schema.tables[0],schema.tables[0]]})).toThrow("Duplicate table");});
  it("rejects duplicate and reserved columns",()=>{expect(()=>createDatabaseSchema({tables:[{name:"tasks",columns:[{name:"owner_id",type:"text"}]}]})).toThrow("column");});
  it("rejects unsupported types",()=>{expect(()=>createDatabaseSchema({tables:[{name:"tasks",columns:[{name:"title",type:"raw_sql"}]}]})).toThrow("type");});
  it("requires server-verified authenticated identity",()=>{const userId="11111111-1111-4111-8111-111111111111";expect(assertAuthenticatedActor({userId,verified:true}).userId).toBe(userId);expect(()=>assertAuthenticatedActor({userId,verified:false})).toThrow("verified");});
});

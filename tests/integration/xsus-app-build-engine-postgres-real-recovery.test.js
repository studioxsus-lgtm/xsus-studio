import {describe,it,expect} from "vitest";
import {readFile} from "node:fs/promises";
import {createPostgresRecoveryIntegration} from "../../src/xsus-app-build-engine/sandbox/postgres-recovery-integration.js";
/**
 * Opt-in only. Requires a disposable PostgreSQL database whose name starts
 * with xsus_test_. Never point this at a shared Supabase/production database.
 * Run with XSUS_TEST_DATABASE_URL and XSUS_REAL_PG_TEST=1, plus pg installed.
 */
const enabled=process.env.XSUS_REAL_PG_TEST==="1"&&!!process.env.XSUS_TEST_DATABASE_URL;
describe.skipIf(!enabled)("XSUS phase 61 disposable PostgreSQL integration",()=>{
 it("persists, deduplicates and reviews with real PostgreSQL",async()=>{
  const url=new URL(process.env.XSUS_TEST_DATABASE_URL);
  if(!url.pathname.slice(1).startsWith("xsus_test_"))throw new Error("Refusing non-disposable PostgreSQL database");
  const {Client}=await import("pg");
  const client=new Client({connectionString:url.toString()});
  await client.connect();
  const suffix=Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);
  const executionId="execution-"+suffix,operationId="operation-"+suffix;
  try{
   await client.query("BEGIN");
   for(const file of ["postgres-execution-schema.sql","postgres-cancellation-recovery-schema.sql"]){
    const sql=await readFile(new URL("../../src/xsus-app-build-engine/sandbox/"+file,import.meta.url),"utf8");
    await client.query(sql);
   }
   await client.query("INSERT INTO xsus_internal.build_executions (execution_id,owner_id,state,revision,fence,updated_at_ms) VALUES ($1,$2,'registered',1,1,0)",[executionId,"owner-0001"]);
   const api=createPostgresRecoveryIntegration({query:(sql,args)=>client.query(sql,args),authorizeReview:async()=>true});
   const receipt={executionId,operationId,reason:"timeout",stopRequested:true};
   expect((await api.recordUncertain(receipt)).status).toBe("uncertain");
   expect((await api.recordUncertain(receipt)).status).toBe("uncertain");
   expect((await api.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).status).toBe("reviewed");
   await expect(api.markReviewed({executionId,operationId,reviewerId:"reviewer-0001",evidenceId:"evidence-0001"})).rejects.toThrow("not reviewable");
  }finally{await client.query("ROLLBACK");await client.end();}
 });
});

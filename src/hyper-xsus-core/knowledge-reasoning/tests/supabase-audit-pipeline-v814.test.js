import {describe,it,expect} from "vitest";
import {createSupabaseAuditPipeline} from "../supabase-audit-pipeline-v814.js";
const ZERO="0".repeat(64),KEY="k".repeat(40);
const ID="123e4567-e89b-42d3-a456-426614174000";
function setup(options={}){
 const rows=[];
 let checkpoint={count:0,tip:ZERO};
 const storage={
  list:async()=>rows.map(x=>structuredClone(x)),
  append:async row=>{rows.push(structuredClone(row));return structuredClone(row);}
 };
 const make=(overrides={})=>createSupabaseAuditPipeline({
  storage,key:KEY,keyId:"test-key",
  readTrustedCheckpoint:async()=>checkpoint,createEventId:()=>ID,
  ...options,...overrides
 });
 return {rows,storage,make,setCheckpoint:value=>{checkpoint=value;}};
}
describe("Hyper XSUS Core v8.1.4 integration pipeline",()=>{
 it("requires dependencies",()=>{
  expect(()=>createSupabaseAuditPipeline()).toThrow(TypeError);
 });
 it("inspects a matching empty checkpoint",async()=>{
  const x=setup();
  expect(await x.make().inspect()).toMatchObject({verified:true,count:0,
   recoveryAuthorized:false,safeToResume:false});
 });
 it("appends a signed record and reports pending checkpoint",async()=>{
  const x=setup();
  const report=await x.make().append({event:"verified"});
  expect(report).toMatchObject({status:"pending-trusted-checkpoint",count:1,
   recoveryAuthorized:false,safeToResume:false});
  expect(x.rows).toHaveLength(1);
 });
 it("does not allow a second write while checkpoint lags",async()=>{
  const x=setup(),pipeline=x.make();
  await pipeline.append({event:1});
  await expect(pipeline.append({event:2})).rejects.toMatchObject({
   code:"XSUS_AUDIT_PIPELINE_NOT_READY"});
 });
 it("accepts a reviewed checkpoint after an append",async()=>{
  const x=setup(),pipeline=x.make();
  const first=await pipeline.append({event:1});
  x.setCheckpoint({count:first.count,tip:first.tip});
  expect((await pipeline.inspect()).verified).toBe(true);
 });
 it("blocks tampered records",async()=>{
  const x=setup(),pipeline=x.make();
  const first=await pipeline.append({event:1});
  x.rows[0].payload={event:"modified"};
  x.setCheckpoint({count:first.count,tip:first.tip});
  expect((await pipeline.inspect()).verified).toBe(false);
 });
 it("blocks unavailable checkpoint",async()=>{
  const x=setup();
  const pipeline=x.make({readTrustedCheckpoint:async()=>{throw Error("offline");}});
  await expect(pipeline.append({event:1})).rejects.toMatchObject({
   code:"XSUS_AUDIT_PIPELINE_NOT_READY"});
 });
 it("rejects invalid payloads",async()=>{
  const x=setup();
  await expect(x.make().append([])).rejects.toMatchObject({
   code:"XSUS_AUDIT_PIPELINE_INVALID_PAYLOAD"});
 });
 it("fails closed on uncertain writes",async()=>{
  const x=setup();
  const pipeline=x.make({storage:{...x.storage,append:async()=>{throw Error("timeout");}}});
  await expect(pipeline.append({event:1})).rejects.toMatchObject({
   code:"XSUS_AUDIT_PIPELINE_WRITE_UNCERTAIN"});
 });
 it("detects an unexpected post-write chain",async()=>{
  const x=setup();
  const pipeline=x.make({storage:{...x.storage,append:async row=>{
   x.rows.push(row,{...row,sequence:2,previous_hash:row.entry_hash});
   return row;
  }}});
  await expect(pipeline.append({event:1})).rejects.toMatchObject({
   code:"XSUS_AUDIT_PIPELINE_POSTVERIFY_FAILED"});
 });
 it("rejects an invalid event ID",async()=>{
  const x=setup();
  await expect(x.make({createEventId:()=> "bad"}).append({event:1}))
   .rejects.toMatchObject({code:"XSUS_AUDIT_PIPELINE_INVALID_EVENT_ID"});
 });
 it("does not leak signing key in reports",async()=>{
  const x=setup();
  expect(JSON.stringify(await x.make().append({event:1}))).not.toContain(KEY);
 });
});

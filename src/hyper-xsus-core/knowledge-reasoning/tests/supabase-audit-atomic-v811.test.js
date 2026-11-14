import {describe,it,expect,vi} from "vitest";
import {createSupabaseAuditStorage} from "../supabase-audit-storage-v81.js";
const zero="0".repeat(64);
const row={event_id:"123e4567-e89b-42d3-a456-426614174000",
 sequence:1,previous_hash:zero,entry_hash:"a".repeat(64),payload:{kind:"audit"}};
function setup(response){
 const fetchImpl=vi.fn(async()=>response);
 return {store:createSupabaseAuditStorage({
  url:"https://example.supabase.co",key:"server-secret",fetchImpl}),fetchImpl};
}
describe("Hyper v8.1.1 atomic append RPC boundary",()=>{
 it("uses the RPC, not direct table inserts",async()=>{
  const x=setup({ok:true,json:async()=>[row]});
  await x.store.append(row);
  const [url,options]=x.fetchImpl.mock.calls[0];
  expect(url).toBe("https://example.supabase.co/rest/v1/rpc/xsus_hyper_append_v811");
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body).p_previous_hash).toBe(zero);
 });
 it("fails closed on a rejected chain-head compare",async()=>{
  const x=setup({ok:false,status:409});
  await expect(x.store.append(row)).rejects.toMatchObject({
   code:"XSUS_SUPABASE_AUDIT_UNAVAILABLE"});
 });
 it("rejects a nonmatching RPC confirmation",async()=>{
  const x=setup({ok:true,json:async()=>[{...row,entry_hash:"b".repeat(64)}]});
  await expect(x.store.append(row)).rejects.toMatchObject({
   code:"XSUS_SUPABASE_AUDIT_UNCERTAIN"});
 });
 it("rejects malformed RPC output",async()=>{
  const x=setup({ok:true,json:async()=>({message:"unexpected"})});
  await expect(x.store.append(row)).rejects.toMatchObject({
   code:"XSUS_SUPABASE_AUDIT_INVALID_RESPONSE"});
 });
 it("does not expose the server key in returned rows",async()=>{
  const x=setup({ok:true,json:async()=>[row]});
  expect(JSON.stringify(await x.store.append(row))).not.toContain("server-secret");
 });
});

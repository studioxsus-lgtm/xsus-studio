import {describe,it,expect,vi} from "vitest";
import {createSupabaseAuditStorage} from "../supabase-audit-storage-v81.js";
const ZERO="0".repeat(64);
const row={event_id:"123e4567-e89b-42d3-a456-426614174000",sequence:1,
 previous_hash:ZERO,entry_hash:"a".repeat(64),payload:{kind:"test"}};
const setup=(rows=[row],ok=true)=>{
 const fetchImpl=vi.fn(async()=>({ok,json:async()=>rows}));
 return {store:createSupabaseAuditStorage({url:"https://example.supabase.co",
  key:"server-only-secret",fetchImpl}),fetchImpl};
};
describe("Hyper v8.1 Supabase audit storage primitive",()=>{
 it("requires trusted configuration",()=>{
  expect(()=>createSupabaseAuditStorage()).toThrow(TypeError);
 });
 it("rejects arbitrary table names",()=>{
  expect(()=>createSupabaseAuditStorage({url:"https://example.supabase.co",
   key:"key",table:"ai_messages"})).toThrow(TypeError);
 });
 it("appends an explicitly numbered event",async()=>{
  const {store,fetchImpl}=setup();
  expect(await store.append(row)).toMatchObject(row);
  expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
 });
 it("never returns credentials in event output",async()=>{
  const {store}=setup();
  expect(JSON.stringify(await store.append(row))).not.toContain("server-only-secret");
 });
 it("lists an intact chain",async()=>{
  const {store}=setup();
  expect((await store.list()).length).toBe(1);
 });
 it("rejects a sequence gap",async()=>{
  const {store}=setup([{...row,sequence:2}]);
  await expect(store.list()).rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_CHAIN_GAP"});
 });
 it("rejects broken links",async()=>{
  const second={...row,event_id:"123e4567-e89b-42d3-a456-426614174001",
   sequence:2,previous_hash:"b".repeat(64)};
  const {store}=setup([row,second]);
  await expect(store.list()).rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_CHAIN_GAP"});
 });
 it("fails closed on service errors",async()=>{
  const {store,fetchImpl}=setup();
  fetchImpl.mockResolvedValueOnce({ok:false});
  await expect(store.list()).rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_UNAVAILABLE"});
 });
 it("rejects invalid payloads",async()=>{
  const {store}=setup();
  await expect(store.append({...row,payload:[]})).rejects.toMatchObject({
   code:"XSUS_SUPABASE_AUDIT_INVALID_ROW"});
 });
 it("rejects unconfirmed writes",async()=>{
  const {store}=setup([]);
  await expect(store.append(row)).rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_UNCERTAIN"});
 });
});

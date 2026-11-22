import {describe,it,expect,vi} from "vitest";
import {createSupabaseProjectStore} from "../../src/xsus-app-build-engine/integrations/supabase-project-store.js";
const owner="11111111-1111-4111-8111-111111111111";
const manifest={project:"demo-app",files:[{path:"index.html",content:"<!doctype html>"}]};
function fakeClient({userId=owner,record=null,error=null}={}){
  const query={eq:vi.fn(()=>query),select:vi.fn(()=>query),single:vi.fn(async()=>({data:record,error})),maybeSingle:vi.fn(async()=>({data:record,error}))};
  query.upsert=vi.fn(()=>query);
  return {auth:{getUser:vi.fn(async()=>({data:{user:{id:userId}}}))},from:vi.fn(()=>query),query};
}
describe("XSUS Supabase project store phase 17",()=>{
  it("requires authenticated client",()=>expect(()=>createSupabaseProjectStore({client:{}})).toThrow("client"));
  it("saves a validated manifest",async()=>{const client=fakeClient({record:{owner_id:owner,slug:"demo-app",manifest}});const result=await createSupabaseProjectStore({client}).save(manifest);expect(result.project).toBe("demo-app");expect(client.query.upsert).toHaveBeenCalledOnce();});
  it("loads only the current user's project",async()=>{const client=fakeClient({record:{owner_id:owner,slug:"demo-app",manifest}});expect((await createSupabaseProjectStore({client}).load("demo-app")).project).toBe("demo-app");expect(client.query.eq).toHaveBeenCalledWith("owner_id",owner);});
  it("returns null for missing project",async()=>{const client=fakeClient();expect(await createSupabaseProjectStore({client}).load("demo-app")).toBe(null);});
  it("rejects a foreign owner response",async()=>{const client=fakeClient({record:{owner_id:"22222222-2222-4222-8222-222222222222",slug:"demo-app",manifest}});await expect(createSupabaseProjectStore({client}).load("demo-app")).rejects.toThrow("ownership");});
  it("rejects unauthenticated sessions",async()=>{const client=fakeClient({userId:null});await expect(createSupabaseProjectStore({client}).load("demo-app")).rejects.toThrow("UUID");});
  it("does not expose database error details",async()=>{const client=fakeClient({error:{message:"internal secret"}});await expect(createSupabaseProjectStore({client}).load("demo-app")).rejects.toThrow("Supabase operation failed");});
  it("rejects unsafe project identifiers",async()=>{const client=fakeClient();await expect(createSupabaseProjectStore({client}).load("../escape")).rejects.toThrow("slug");});
});

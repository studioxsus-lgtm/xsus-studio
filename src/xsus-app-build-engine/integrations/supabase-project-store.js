import {validateBuildManifest} from "../build/build-manifest.js";
export const SUPABASE_PROJECT_STORE_VERSION="0.1.0";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertUser(userId){if(typeof userId!=="string"||!UUID.test(userId))throw new TypeError("Valid authenticated user UUID required");}
function assertClient(client){if(!client||typeof client.from!=="function"||!client.auth||typeof client.auth.getUser!=="function")throw new TypeError("Authenticated Supabase client required");}
function assertResult(result){if(!result||typeof result!=="object")throw new TypeError("Invalid Supabase response");if(result.error)throw new Error("Supabase operation failed");return result.data;}
export function createSupabaseProjectStore({client,table="xsus_build_projects"}={}){
  assertClient(client);
  if(table!=="xsus_build_projects")throw new TypeError("Unsupported project table");
  async function authenticatedUser(){
    const result=await client.auth.getUser();
    if(result?.error)throw new Error("Authentication failed");
    const userId=result?.data?.user?.id;
    assertUser(userId);
    return userId;
  }
  return Object.freeze({
    async save(input){
      const manifest=validateBuildManifest(input);
      const owner_id=await authenticatedUser();
      const payload={owner_id,slug:manifest.project,manifest:{project:manifest.project,files:manifest.files}};
      const query=client.from(table).upsert(payload,{onConflict:"owner_id,slug"}).select("slug,manifest,owner_id").single();
      const data=assertResult(await query);
      if(data?.owner_id!==owner_id||data?.slug!==manifest.project)throw new Error("Unexpected project ownership or slug");
      return validateBuildManifest(data.manifest);
    },
    async load(project){
      if(typeof project!=="string"||!/^[a-z][a-z0-9-]{1,47}$/.test(project))throw new TypeError("Invalid project slug");
      const owner_id=await authenticatedUser();
      const query=client.from(table).select("slug,manifest,owner_id").eq("owner_id",owner_id).eq("slug",project).maybeSingle();
      const data=assertResult(await query);
      if(data===null)return null;
      if(data?.owner_id!==owner_id||data?.slug!==project)throw new Error("Unexpected project ownership or slug");
      return validateBuildManifest(data.manifest);
    }
  });
}

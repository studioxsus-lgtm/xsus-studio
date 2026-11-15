/**
 * Server-only owner authorization. Requires an independently deployed ownership
 * mapping table. Denies all access if table or record is unavailable.
 */
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHyperEvidenceOwnerAuthorizer({url,serviceRoleKey,fetchImpl=globalThis.fetch}={}){
  let parsed;
  try{parsed=new URL(url);}catch{throw new TypeError("Invalid owner lookup configuration");}
  if(parsed.protocol!=="https:" || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
    parsed.port || parsed.pathname!=="/" || parsed.search || parsed.hash ||
    parsed.username || parsed.password || typeof serviceRoleKey!=="string" ||
    !serviceRoleKey.trim() || typeof fetchImpl!=="function")
    throw new TypeError("Invalid owner lookup configuration");
  return async function authorizeEvidenceOwner({userId,observationId}={}){
    if(typeof userId!=="string" || !UUID.test(userId) ||
       typeof observationId!=="string" || !ID.test(observationId))return false;
    try{
      const endpoint=parsed.origin+"/rest/v1/hyper_evidence_owners?select=user_id,observation_id"+
        "&observation_id=eq."+encodeURIComponent(observationId)+"&limit=2";
      const response=await fetchImpl(endpoint,{method:"GET",headers:{
        apikey:serviceRoleKey,Authorization:"Bearer "+serviceRoleKey,Accept:"application/json"
      },redirect:"error",signal:AbortSignal.timeout(10000)});
      if(!response?.ok)return false;
      const records=await response.json();
      return Array.isArray(records)&&records.length===1&&
        records[0]?.user_id===userId&&records[0]?.observation_id===observationId;
    }catch{return false;}
  };
}

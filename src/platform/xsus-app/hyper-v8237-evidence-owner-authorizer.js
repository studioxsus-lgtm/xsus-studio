/**
 * Hyper v8.2.37 — trusted server-side evidence ownership check.
 * Read-only Supabase REST lookup. No public route, no migrations, disabled by default.
 * Service-role credentials must be injected server-side and never exposed to clients.
 */
export const HYPER_EVIDENCE_OWNER_VERSION = "8.2.37";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBS = /^[A-Za-z0-9_-]{1,128}$/;
export function createHyperEvidenceOwnerAuthorizer({
  url,serviceRoleKey,fetchImpl=globalThis.fetch,enabled=false
}={}) {
  let parsed;
  try {parsed=new URL(url);} catch {throw new TypeError("Invalid ownership provider configuration.");}
  if(parsed.protocol!=="https:" || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
     parsed.username || parsed.password || parsed.port || parsed.pathname!=="/" ||
     parsed.search || parsed.hash || typeof serviceRoleKey!=="string" ||
     !serviceRoleKey.trim() || typeof fetchImpl!=="function")
    throw new TypeError("Invalid ownership provider configuration.");
  const endpoint=parsed.origin+"/rest/v1/hyper_evidence_owners";
  return Object.freeze({
    version:HYPER_EVIDENCE_OWNER_VERSION,
    productionEligible:false,
    async authorizeEvidenceOwner({userId,observationId}={}) {
      if(enabled!==true || typeof userId!=="string" || !UUID.test(userId) ||
         typeof observationId!=="string" || !OBS.test(observationId)) return false;
      try {
        const query=new URLSearchParams({
          select:"observation_id,user_id",
          observation_id:"eq."+observationId,
          user_id:"eq."+userId,
          limit:"2"
        });
        const response=await fetchImpl(endpoint+"?"+query.toString(),{
          method:"GET",
          headers:{apikey:serviceRoleKey,Authorization:"Bearer "+serviceRoleKey,Accept:"application/json"},
          redirect:"error",signal:AbortSignal.timeout(10000)
        });
        if(!response?.ok) return false;
        const rows=await response.json();
        return Array.isArray(rows) && rows.length===1 &&
          rows[0]?.observation_id===observationId && rows[0]?.user_id===userId;
      } catch {return false;}
    }
  });
}

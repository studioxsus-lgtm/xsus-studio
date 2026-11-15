/**
 * Read-only production-safe negative authorization check.
 * Never prints tokens, user IDs, records or raw errors.
 * No writes; does not activate any endpoint.
 */
import { randomUUID } from "node:crypto";
import { createHyperEvidenceOwnerAuthorizer } from "../src/platform/xsus-app/hyper-evidence-owner-authorizer.js";

async function main() {
  try {
    const authorize = createHyperEvidenceOwnerAuthorizer({
      url:process.env.SUPABASE_URL,
      serviceRoleKey:process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    const userId=randomUUID();
    const observationId="negative_"+randomUUID().replaceAll("-","");
    const allowed=await authorize({userId,observationId});
    if(allowed !== false) return {ok:false,code:"UNEXPECTED_OWNER_AUTHORIZATION"};
    // This is only a denial check, not a proof that the lookup succeeded.
    return {ok:true,code:"UNKNOWN_EVIDENCE_DENIED",positivePathVerified:false,productionEligible:false};
  } catch {
    return {ok:false,code:"OWNER_DENIAL_CHECK_UNAVAILABLE"};
  }
}
const result=await main();
process.stdout.write(JSON.stringify(result)+"\n");
if(!result.ok) process.exitCode=1;

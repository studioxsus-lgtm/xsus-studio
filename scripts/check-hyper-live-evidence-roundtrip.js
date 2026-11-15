/**
 * Controlled live evidence round-trip. DRY RUN by default.
 * Only use with a dedicated test user and explicit opt-in.
 * This script intentionally does not delete evidence (append-only).
 */
import {randomUUID} from "node:crypto";
import {createHyperTrustedAtomicIntegration} from "../src/platform/xsus-app/hyper-v8226-trusted-atomic-integration.js";
import {createHyperEvidenceOwnerAuthorizer} from "../src/platform/xsus-app/hyper-evidence-owner-authorizer.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function report(result){process.stdout.write(JSON.stringify(result)+"\n");if(!result.ok)process.exitCode=1;}
const enabled=process.env.XSUS_HYPER_LIVE_WRITE_TEST==="true";
if(!enabled){
  report({ok:true,code:"DRY_RUN_NO_WRITES",writeEnabled:false,productionEligible:false});
}else{
  const url=process.env.SUPABASE_URL;
  const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyHex=process.env.XSUS_HYPER_EVIDENCE_KEY;
  const keyId=process.env.XSUS_HYPER_EVIDENCE_KEY_ID;
  const userId=process.env.XSUS_HYPER_TEST_USER_ID;
  if(!UUID.test(userId||"")||!/^[0-9a-fA-F]{64}$/.test(keyHex||"")||
    !/^[A-Za-z0-9_-]{1,64}$/.test(keyId||"")){
    report({ok:false,code:"TEST_CONFIG_INVALID"});
  }else{
    try{
      const storage=createHyperTrustedAtomicIntegration({
        url,serviceRoleKey,key:Buffer.from(keyHex,"hex"),keyId,enabled:true
      });
      const authorize=createHyperEvidenceOwnerAuthorizer({url,serviceRoleKey});
      const observationId="integration_"+randomUUID().replaceAll("-","");
      const now=new Date().toISOString();
      const input={observationId,serviceId:"xsus-studio",
        snapshot:{instanceId:randomUUID(),processId:process.pid,
          startedAt:now,observedAt:now,source:"local-process-observation"}};
      const stored=await storage.store(input);
      if(!stored.stored){
        report({ok:false,code:"BUNDLE_WRITE_FAILED"});
      }else{
        // Mapping insert is separate: a failure leaves an orphan signed bundle.
        const endpoint=new URL("/rest/v1/hyper_evidence_owners",url).toString();
        const response=await fetch(endpoint,{
          method:"POST",redirect:"error",signal:AbortSignal.timeout(10000),
          headers:{apikey:serviceRoleKey,Authorization:"Bearer "+serviceRoleKey,
            "Content-Type":"application/json",Prefer:"return=minimal"},
          body:JSON.stringify({observation_id:observationId,user_id:userId})
        });
        if(!response.ok){
          report({ok:false,code:"OWNER_MAPPING_WRITE_FAILED",orphanBundlePossible:true});
        }else{
          const verified=await storage.readVerified(observationId);
          const owned=await authorize({userId,observationId});
          const foreign=await authorize({userId:randomUUID(),observationId});
          report({
            ok:verified.verified===true&&owned===true&&foreign===false,
            code:verified.verified===true&&owned===true&&foreign===false?
              "LIVE_ROUNDTRIP_PASSED":"LIVE_ROUNDTRIP_FAILED",
            testRecordsPersist:true,productionEligible:false
          });
        }
      }
    }catch{
      report({ok:false,code:"LIVE_ROUNDTRIP_UNAVAILABLE"});
    }
  }
}

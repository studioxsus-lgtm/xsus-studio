/**
 * Read-only, local-only Hyper HMAC smoke check.
 * Run inside trusted Render Shell: node scripts/check-hyper-evidence-hmac.js
 * Never prints secrets, key IDs, digests or signatures.
 * No network, database access, or route activation.
 */
import { randomUUID } from "node:crypto";
import { createHyperEvidenceProvenance } from "../src/platform/xsus-app/hyper-v8222-evidence-provenance.js";

function check(env = process.env) {
  const raw = env.XSUS_HYPER_EVIDENCE_KEY;
  const keyId = env.XSUS_HYPER_EVIDENCE_KEY_ID;
  if (typeof raw !== "string" || !/^[0-9a-fA-F]{64}$/.test(raw) ||
      typeof keyId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(keyId))
    return {ok:false,code:"HMAC_CONFIG_INVALID"};
  try {
    const provenance = createHyperEvidenceProvenance({
      key:Buffer.from(raw,"hex"),keyId
    });
    const now = new Date().toISOString();
    const input = {
      observationId:"smoke_"+randomUUID().replaceAll("-",""),
      serviceId:"xsus-studio",
      snapshot:{
        instanceId:randomUUID(),processId:process.pid,
        startedAt:now,observedAt:now,
        source:"local-process-observation"
      }
    };
    const envelope = provenance.sign(input);
    const valid = provenance.verify(input,envelope);
    const tampered = provenance.verify({
      ...input,snapshot:{...input.snapshot,processId:process.pid+1}
    },envelope);
    if(valid.verified !== true || tampered.verified !== false)
      return {ok:false,code:"HMAC_SELF_TEST_FAILED"};
    return {ok:true,code:"HMAC_SELF_TEST_PASSED",runtimeAttested:false,productionEligible:false};
  } catch {
    return {ok:false,code:"HMAC_SELF_TEST_FAILED"};
  }
}
const result=check();
process.stdout.write(JSON.stringify(result)+"\n");
if(!result.ok) process.exitCode=1;

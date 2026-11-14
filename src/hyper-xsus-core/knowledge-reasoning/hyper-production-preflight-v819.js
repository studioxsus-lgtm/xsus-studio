/**
 * Hyper XSUS Core v8.1.9 — production preflight (configuration only).
 * No network calls, no database writes, no secret values in reports.
 * This does not activate the v8.1 storage pipeline or certify deployment.
 */
export const HYPER_V819_PREFLIGHT_VERSION="8.1.9";
const HTTPS=/^https:\/\/([a-z0-9.-]+)(?::443)?\/?$/i;
const REQUIRED=[
 "SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY",
 "XSUS_HYPER_V81_AUDIT_KEY","XSUS_HYPER_V81_AUDIT_KEY_ID",
 "XSUS_HYPER_CHECKPOINT_URL","XSUS_HYPER_CHECKPOINT_SERVICE_ROLE_KEY",
 "XSUS_HYPER_CHECKPOINT_SIGNING_KEY","XSUS_HYPER_CHECKPOINT_KEY_ID"
];
const unique=items=>Object.freeze([...new Set(items)].sort());
export function inspectHyperV819Preflight(env={}){
 const blockers=[];
 const enabled=env.XSUS_HYPER_V81_ENABLED==="true";
 if(!enabled)blockers.push("V81_NOT_ENABLED");
 for(const name of REQUIRED)
  if(typeof env[name]!=="string"||!env[name].trim())
   blockers.push("MISSING_"+name);
 const auditUrl=typeof env.SUPABASE_URL==="string"?
  env.SUPABASE_URL.trim():"";
 const checkpointUrl=typeof env.XSUS_HYPER_CHECKPOINT_URL==="string"?
  env.XSUS_HYPER_CHECKPOINT_URL.trim():"";
 const auditHost=HTTPS.exec(auditUrl)?.[1]?.toLowerCase();
 const checkpointHost=HTTPS.exec(checkpointUrl)?.[1]?.toLowerCase();
 if(auditUrl&&!auditHost)blockers.push("INVALID_AUDIT_URL");
 if(checkpointUrl&&!checkpointHost)blockers.push("INVALID_CHECKPOINT_URL");
 if(auditHost&&checkpointHost&&auditHost===checkpointHost)
  blockers.push("CHECKPOINT_NOT_SEPARATE_PROJECT");
 const auditKey=env.XSUS_HYPER_V81_AUDIT_KEY;
 const checkpointKey=env.XSUS_HYPER_CHECKPOINT_SIGNING_KEY;
 if(typeof auditKey==="string"&&auditKey.length<32)
  blockers.push("AUDIT_SIGNING_KEY_TOO_SHORT");
 if(typeof checkpointKey==="string"&&checkpointKey.length<32)
  blockers.push("CHECKPOINT_SIGNING_KEY_TOO_SHORT");
 if(auditKey&&checkpointKey&&auditKey===checkpointKey)
  blockers.push("SIGNING_KEYS_NOT_INDEPENDENT");
 if(env.SUPABASE_SERVICE_ROLE_KEY&&
  env.SUPABASE_SERVICE_ROLE_KEY===env.XSUS_HYPER_CHECKPOINT_SERVICE_ROLE_KEY)
  blockers.push("DATABASE_CREDENTIALS_NOT_INDEPENDENT");
 if(env.XSUS_HYPER_APP_ENABLED==="true")
  blockers.push("LEGACY_FILESYSTEM_HYPER_ROUTE_ENABLED");
 const result=unique(blockers);
 return Object.freeze({
  version:HYPER_V819_PREFLIGHT_VERSION,
  enabled,configurationReady:result.length===0,
  deploymentVerified:false,liveStorageVerified:false,
  blockers:result
 });
}

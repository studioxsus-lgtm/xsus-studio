/**
 * Deployment gate for XSUS App / Hyper XSUS Core.
 * Checks configuration shape only; never logs secret values or reads stores.
 */
import {isAbsolute,resolve} from "node:path";

export const HYPER_DEPLOYMENT_GATE_VERSION="1.0.0";
const required=[
 "SUPABASE_URL","SUPABASE_ANON_KEY",
 "XSUS_HYPER_AUDIT_DIRECTORY","XSUS_HYPER_AUDIT_KEY",
 "XSUS_HYPER_AUDIT_KEY_ID","XSUS_HYPER_ANCHOR_DIRECTORY",
 "XSUS_HYPER_ANCHOR_KEY","XSUS_HYPER_ANCHOR_KEY_ID"
];
export function inspectHyperDeploymentConfig(env={}){
 const blockers=[];
 const enabled=env.XSUS_HYPER_APP_ENABLED==="true";
 if(!enabled)return Object.freeze({version:HYPER_DEPLOYMENT_GATE_VERSION,
  enabled:false,ready:false,blockers:Object.freeze(["HYPER_INTEGRATION_DISABLED"])});
 for(const name of required){
  if(typeof env[name]!=="string"||!env[name].trim())
   blockers.push("MISSING_"+name);
 }
 if(typeof env.SUPABASE_URL==="string"&&
    !/^https:\/\/[^/\s]+$/.test(env.SUPABASE_URL))
  blockers.push("INVALID_SUPABASE_URL");
 const audit=env.XSUS_HYPER_AUDIT_DIRECTORY;
 const anchor=env.XSUS_HYPER_ANCHOR_DIRECTORY;
 if(typeof audit==="string"&&audit&&!isAbsolute(audit))
  blockers.push("AUDIT_DIRECTORY_NOT_ABSOLUTE");
 if(typeof anchor==="string"&&anchor&&!isAbsolute(anchor))
  blockers.push("ANCHOR_DIRECTORY_NOT_ABSOLUTE");
 if(typeof audit==="string"&&typeof anchor==="string"&&
    isAbsolute(audit)&&isAbsolute(anchor)&&resolve(audit)===resolve(anchor))
  blockers.push("ANCHOR_AUDIT_DIRECTORY_COLLISION");
 if(env.XSUS_HYPER_AUDIT_KEY&&env.XSUS_HYPER_ANCHOR_KEY&&
    env.XSUS_HYPER_AUDIT_KEY===env.XSUS_HYPER_ANCHOR_KEY)
  blockers.push("SIGNING_KEYS_NOT_INDEPENDENT");
 const unique=Object.freeze([...new Set(blockers)].sort());
 return Object.freeze({version:HYPER_DEPLOYMENT_GATE_VERSION,enabled,
  ready:unique.length===0,blockers:unique});
}

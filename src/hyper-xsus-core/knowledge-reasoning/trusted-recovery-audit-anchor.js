/**
 * Hyper XSUS Core v6.0 — explicitly advanced trusted audit anchor.
 * Separate signing key and protected directory required. Single-host only.
 * No automatic advancement or claim of external rollback protection.
 */
import {createDurableIncidentCheckpoint} from "./durable-incident-checkpoint.js";
import {createRecoveryAuditIntegrity} from "./recovery-audit-integrity.js";
import {createTrustedAnchorHealth} from "./trusted-anchor-health.js";
import {resolve,isAbsolute} from "node:path";
export const TRUSTED_RECOVERY_AUDIT_ANCHOR_VERSION="6.0.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function createTrustedRecoveryAuditAnchor({
 directory,key,keyId,auditDirectory,readDurableAudit,authorize
}={}){
 if(typeof directory!=="string"||!isAbsolute(directory)||
  typeof auditDirectory!=="string"||!isAbsolute(auditDirectory)||
  resolve(directory)===resolve(auditDirectory)||
  typeof readDurableAudit!=="function"||typeof authorize!=="function")
  throw new TypeError("Independent absolute anchor/audit directories, audit reader and reviewer required.");
 const store=createDurableIncidentCheckpoint({directory,key,keyId});
 const inspect=createRecoveryAuditIntegrity({directory:auditDirectory,readDurableAudit});
 const health=createTrustedAnchorHealth({directory,readAnchor:()=>store.read(),inspectAudit:options=>inspect.assess(options)});
 async function assess(){
  const anchor=await store.read();
  const report=await inspect.assess({trustedAnchor:anchor});
  return Object.freeze({version:TRUSTED_RECOVERY_AUDIT_ANCHOR_VERSION,
   anchor:Object.freeze({...anchor}),...report});
 }
 async function advance(){
  const previous=await store.read();
  const initial=await inspect.assess({trustedAnchor:previous});
  if(!initial.safeToResume||!initial.audit||initial.audit.count<=previous.count)
   throw fail("XSUS_AUDIT_ANCHOR_BLOCKED","Audit must be authenticated, stable, strictly newer and prefix-consistent.");
  if(await authorize(Object.freeze({
   previous:Object.freeze({...previous}),
   proposed:Object.freeze({...initial.audit})
  }))!==true)
   throw fail("XSUS_AUDIT_ANCHOR_DENIED","Explicit reviewer authorization required.");
  const final=await inspect.assess({trustedAnchor:previous});
  if(!final.safeToResume||!final.audit||
   final.audit.count!==initial.audit.count||final.audit.tip!==initial.audit.tip)
   throw fail("XSUS_AUDIT_ANCHOR_CHANGED","Audit changed during anchor review.");
  // The checkpoint adapter enforces a locked, authenticated monotonic CAS.
  return store.advance(previous,final.audit);
 }
 return Object.freeze({
  version:TRUSTED_RECOVERY_AUDIT_ANCHOR_VERSION,
  initialize:()=>store.initialize(),
  read:()=>store.read(),
  assess,advance,inspectHealth:()=>health.assess()
 });
}

/**
 * Hyper XSUS Core v4.1 — explicit incident recovery composition.
 * No implicit approval, checkpoint creation, lock removal or automatic repair.
 */
import {createIncidentEvidenceArchive} from "./incident-evidence-archive.js";
import {createDurableIncidentCheckpoint} from "./durable-incident-checkpoint.js";
import {createIncidentPrefixGuard} from "./incident-prefix-guard.js";
import {createIncidentCheckpointPromotion} from "./incident-checkpoint-promotion.js";
import {createRecoveryReadinessGuard} from "./recovery-readiness-guard.js";
import {createRecoveryOperationalReport} from "./recovery-operational-report.js";
import {createRecoveryDiagnostics} from "./recovery-diagnostics.js";
import {createRecoveryDecisionIntelligence} from "./recovery-decision-intelligence.js";
import {createRecoveryDecisionVerification} from "./recovery-decision-verification.js";
import {createRecoveryDecisionAudit} from "./recovery-decision-audit.js";
import {createDurableRecoveryAudit} from "./durable-recovery-audit.js";
import {createRecoveryAuditIntegrity} from "./recovery-audit-integrity.js";
import {createTrustedRecoveryAuditAnchor} from "./trusted-recovery-audit-anchor.js";
import {createRecoveryOperationalVerification} from "./recovery-operational-verification-v65.js";
import {createRecoverySecurityValidation} from "./recovery-security-validation-v68.js";
export const INCIDENT_RECOVERY_INTEGRATION_VERSION="4.1.0";
export function createIncidentRecoveryIntegration({archiveDirectory,checkpointDirectory,archiveKey,checkpointKey,archiveKeyId,checkpointKeyId,authorize,durableAudit,trustedAuditAnchor}={}){
 if(typeof archiveDirectory!=="string"||typeof checkpointDirectory!=="string"||
 archiveDirectory===checkpointDirectory||typeof authorize!=="function")
 throw new TypeError("Separate archive/checkpoint directories and reviewer required.");
 const archive=createIncidentEvidenceArchive({directory:archiveDirectory,key:archiveKey,keyId:archiveKeyId});
 const checkpoint=createDurableIncidentCheckpoint({directory:checkpointDirectory,key:checkpointKey,keyId:checkpointKeyId});
 const guard=createIncidentPrefixGuard({directory:archiveDirectory,archive,checkpoint});
 const readiness=createRecoveryReadinessGuard({archiveDirectory,checkpointDirectory,inspect:()=>guard.inspect()});
 const operational=createRecoveryOperationalReport({inspectReadiness:()=>readiness.assess(),verifyArchive:()=>archive.verify(),readCheckpoint:()=>checkpoint.read()});
 const diagnostics=createRecoveryDiagnostics({inspectOperationalReadiness:()=>operational.assess()});
 const decisions=createRecoveryDecisionIntelligence({inspectRecoveryDiagnostics:()=>diagnostics.assess()});
 const decisionVerification=createRecoveryDecisionVerification({inspectOperationalReadiness:()=>operational.assess()});
 const audit=createRecoveryDecisionAudit({verifyRecoveryDecisions:()=>decisionVerification.assess()});
 const durable=durableAudit===undefined?null:createDurableRecoveryAudit(durableAudit);
 const integrity=durable?createRecoveryAuditIntegrity({readDurableAudit:()=>durable.read(),directory:durableAudit.directory}):null;
 if(trustedAuditAnchor!==undefined&&!durable)throw new TypeError("Trusted anchor requires durable audit.");
 const anchor=trustedAuditAnchor===undefined?null:createTrustedRecoveryAuditAnchor({...trustedAuditAnchor,auditDirectory:durableAudit?.directory,readDurableAudit:()=>durable.read()});
 const operationalVerification=anchor?createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()}):null;
 const securityValidation=anchor?createRecoverySecurityValidation({inspectHealth:()=>anchor.inspectHealth()}):null;
 const promotion=createIncidentCheckpointPromotion({guard,archive,checkpoint,authorize,readiness:()=>readiness.assess()});
 return Object.freeze({
  version:INCIDENT_RECOVERY_INTEGRATION_VERSION,
  initializeCheckpoint:()=>checkpoint.initialize(),
  recordIncident:report=>archive.record(report),
  inspect:()=>guard.inspect(),
  inspectReadiness:()=>readiness.assess(),
  inspectOperationalReadiness:()=>operational.assess(),
  inspectRecoveryDiagnostics:()=>diagnostics.assess(),
  inspectRecoveryDecisions:()=>decisions.assess(),
  verifyRecoveryDecisions:()=>decisionVerification.assess(),
  recordRecoveryDecisionAudit:()=>audit.record(),
  listRecoveryDecisionAudit:()=>audit.history(),
  verifyRecoveryDecisionAudit:()=>audit.verify(),
  initializeDurableRecoveryAudit:()=>{if(!durable)throw new Error("Durable audit not configured.");return durable.initialize();},
  readDurableRecoveryAudit:()=>{if(!durable)throw new Error("Durable audit not configured.");return durable.read();},
  inspectDurableRecoveryAudit:(options)=>{if(!integrity)throw new Error("Durable audit not configured.");return integrity.assess(options);},
  recordDurableRecoveryAudit:async()=>{if(!durable)throw new Error("Durable audit not configured.");const verified=await decisionVerification.assess();return durable.append(verified);},
  initializeTrustedAuditAnchor:()=>{if(!anchor)throw new Error("Trusted audit anchor not configured.");return anchor.initialize();},
  readTrustedAuditAnchor:()=>{if(!anchor)throw new Error("Trusted audit anchor not configured.");return anchor.read();},
  inspectTrustedAuditAnchor:()=>{if(!anchor)throw new Error("Trusted audit anchor not configured.");return anchor.assess();},
  advanceTrustedAuditAnchor:()=>{if(!anchor)throw new Error("Trusted audit anchor not configured.");return anchor.advance();},
  inspectTrustedAuditAnchorHealth:()=>{if(!anchor)throw new Error("Trusted audit anchor not configured.");return anchor.inspectHealth();},
  verifyTrustedAuditRecoveryOperation:()=>{if(!operationalVerification)throw new Error("Trusted audit anchor not configured.");return operationalVerification.assess();},
  validateTrustedAuditRecoverySecurity:()=>{if(!securityValidation)throw new Error("Trusted audit anchor not configured.");return securityValidation.assess();},
  promote:()=>promotion.promote(),
  readCheckpoint:()=>checkpoint.read(),
  verifyArchive:()=>archive.verify()
 });
}

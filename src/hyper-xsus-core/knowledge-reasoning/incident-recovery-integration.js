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
export const INCIDENT_RECOVERY_INTEGRATION_VERSION="4.1.0";
export function createIncidentRecoveryIntegration({archiveDirectory,checkpointDirectory,archiveKey,checkpointKey,archiveKeyId,checkpointKeyId,authorize}={}){
 if(typeof archiveDirectory!=="string"||typeof checkpointDirectory!=="string"||
 archiveDirectory===checkpointDirectory||typeof authorize!=="function")
 throw new TypeError("Separate archive/checkpoint directories and reviewer required.");
 const archive=createIncidentEvidenceArchive({directory:archiveDirectory,key:archiveKey,keyId:archiveKeyId});
 const checkpoint=createDurableIncidentCheckpoint({directory:checkpointDirectory,key:checkpointKey,keyId:checkpointKeyId});
 const guard=createIncidentPrefixGuard({directory:archiveDirectory,archive,checkpoint});
 const readiness=createRecoveryReadinessGuard({archiveDirectory,checkpointDirectory,inspect:()=>guard.inspect()});
 const operational=createRecoveryOperationalReport({inspectReadiness:()=>readiness.assess(),verifyArchive:()=>archive.verify(),readCheckpoint:()=>checkpoint.read()});
 const promotion=createIncidentCheckpointPromotion({guard,archive,checkpoint,authorize,readiness:()=>readiness.assess()});
 return Object.freeze({
  version:INCIDENT_RECOVERY_INTEGRATION_VERSION,
  initializeCheckpoint:()=>checkpoint.initialize(),
  recordIncident:report=>archive.record(report),
  inspect:()=>guard.inspect(),
  inspectReadiness:()=>readiness.assess(),
  inspectOperationalReadiness:()=>operational.assess(),
  promote:()=>promotion.promote(),
  readCheckpoint:()=>checkpoint.read(),
  verifyArchive:()=>archive.verify()
 });
}

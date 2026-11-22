import {validateBuildManifest} from "../build/build-manifest.js";
import {createQualityGate} from "../quality/quality-gate.js";
export const RELEASE_SECURITY_GATE_VERSION="0.1.0";
const DANGEROUS_EXTENSIONS=/\.(?:env|pem|key|p12|pfx|sqlite|db)$/i;
const HIDDEN_CONFIG=/(^|\/)\.(?:env|npmrc|gitconfig)(?:\.|$)/i;
const ACTIVE_HTML=/<(?:script|iframe|object|embed|base|form)\b|\bon[a-z]+\s*=|\b(?:href|src)\s*=\s*["']?\s*javascript:/i;
export function inspectReleaseSecurity(input,{qualityGate=createQualityGate({maxWarnings:0})}={}){
  const manifest=validateBuildManifest(input);
  if(!qualityGate||typeof qualityGate.inspect!=="function")throw new TypeError("Quality gate required");
  const quality=qualityGate.inspect(manifest);
  const findings=[];
  for(const file of manifest.files){
    if(DANGEROUS_EXTENSIONS.test(file.path)||HIDDEN_CONFIG.test(file.path)){
      findings.push(Object.freeze({rule:"SENSITIVE_FILE",severity:"error",path:file.path,message:"Sensitive file type must not be packaged"}));
    }
    if(file.path.endsWith(".html")&&ACTIVE_HTML.test(file.content)){
      findings.push(Object.freeze({rule:"ACTIVE_HTML",severity:"error",path:file.path,message:"Active HTML requires sandboxed review"}));
    }
    if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(file.content)){
      findings.push(Object.freeze({rule:"PRIVATE_KEY",severity:"error",path:file.path,message:"Private key material detected"}));
    }
  }
  return Object.freeze({version:RELEASE_SECURITY_GATE_VERSION,approved:false,staticChecksPassed:quality.approved&&findings.length===0,findings:Object.freeze(findings),quality,requiresHumanReview:true,requiresSandboxVerification:true,reason:"Static inspection alone cannot authorize publication"});
}

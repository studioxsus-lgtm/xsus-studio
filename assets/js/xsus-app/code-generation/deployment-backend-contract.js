import { getDeploymentTarget } from './deployment-targets.js';

// Contract only. A trusted backend must authenticate, authorize and execute independently.
// Never accept browser-provided identity, credentials or a claimed approval as authority.
const HASH=/^[a-f0-9]{64}$/;
const FILES=['index.html','styles.css','app.js'];
export const DEPLOYMENT_CONTRACT_VERSION='1.0.0';
export function createDeploymentRequest(plan, projectId) {
  if (!plan || plan.schemaVersion!==2 || plan.status!=='prepared-not-deployed')
    throw new TypeError('A prepared deployment plan is required');
  getDeploymentTarget(plan.target);
  if (typeof projectId!=='string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(projectId))
    throw new TypeError('Invalid project identifier');
  if (!Array.isArray(plan.files) || plan.files.length!==FILES.length ||
      !FILES.every(name=>plan.files.some(file=>file?.name===name &&
        Number.isSafeInteger(file.bytes) && file.bytes>=0 && HASH.test(file.sha256))))
    throw new TypeError('Invalid build integrity records');
  return Object.freeze({
    contractVersion:DEPLOYMENT_CONTRACT_VERSION,
    operation:'deployment.request',
    projectId,
    target:plan.target,
    files:plan.files.map(({name,bytes,sha256})=>({name,bytes,sha256})),
    requestedAction:'validate-only'
  });
}
export function validateDeploymentResponse(response) {
  if (!response || response.contractVersion!==DEPLOYMENT_CONTRACT_VERSION ||
      response.operation!=='deployment.request' ||
      !['denied','validation-required','approved-for-review'].includes(response.status) ||
      typeof response.requestId!=='string' || response.requestId.length>128 ||
      typeof response.reason!=='string' || response.reason.length>500 ||
      response.deployed!==false) return {ok:false,reason:'Invalid deployment response'};
  return {ok:true,status:response.status,deployed:false};
}
export function offlineDeploymentDecision() {
  return {contractVersion:DEPLOYMENT_CONTRACT_VERSION,operation:'deployment.request',
    requestId:'',status:'denied',reason:'No authenticated deployment backend is configured',deployed:false};
}

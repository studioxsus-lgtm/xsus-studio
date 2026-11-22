// Local, one-shot consent for exporting a deployment plan. Not server authentication.
export function authorizeDeploymentPreparation({target,acknowledged,confirmation}, allowedTargets) {
  if (!Array.isArray(allowedTargets) || !allowedTargets.includes(target))
    return {authorized:false,reason:'Unsupported deployment target'};
  if (acknowledged !== true)
    return {authorized:false,reason:'Review acknowledgement is required'};
  if (confirmation !== 'PREPARE')
    return {authorized:false,reason:'Enter PREPARE to confirm the selected target'};
  return {authorized:true,scope:'export-plan-only',target,remoteDeploymentAllowed:false};
}

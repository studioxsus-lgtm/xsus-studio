import {createDeploymentPlan} from "./deployment-plan.js";
export const DEPLOYMENT_PUBLISHER_VERSION="0.1.0";
export function createDeploymentPublisher({provider,securityVerifier}={}){
  if(!provider||typeof provider.publish!=="function")throw new TypeError("Trusted deployment provider required");
  if(typeof securityVerifier!=="function")throw new TypeError("Independent security verifier required");
  return Object.freeze({
    async publish(input,{deploymentId,target,environment="staging",approved=false,signal}={}){
      const plan=createDeploymentPlan(input,{deploymentId,target,environment});
      if(approved!==true)throw new Error("Deployment requires explicit approval");
      if(signal?.aborted)throw new Error("Deployment cancelled");
      const verified=await securityVerifier(plan,{signal});
      if(verified!==true)throw new Error("Deployment security verification failed");
      if(signal?.aborted)throw new Error("Deployment cancelled");
      const result=await provider.publish(plan,{signal});
      if(!result||typeof result!=="object"||result.success!==true||typeof result.deploymentRef!=="string"||!ID.test(result.deploymentRef))throw new TypeError("Invalid deployment provider result");
      return Object.freeze({version:DEPLOYMENT_PUBLISHER_VERSION,id:plan.id,project:plan.project,target:plan.target,environment:plan.environment,deploymentRef:result.deploymentRef,status:"submitted",verifiedByProvider:false});
    }
  });
}
const ID=/^[a-zA-Z0-9_-]{1,80}$/;

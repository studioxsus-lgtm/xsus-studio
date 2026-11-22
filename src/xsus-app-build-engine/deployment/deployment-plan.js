import {validateBuildManifest} from "../build/build-manifest.js";
export const DEPLOYMENT_PLAN_VERSION="0.1.0";
const TARGETS=new Set(["render-static","github-pages"]);
const ID=/^[a-zA-Z0-9_-]{1,80}$/;
export function createDeploymentPlan(input,{deploymentId,target,environment="staging"}={}){
  const manifest=validateBuildManifest(input);
  if(typeof deploymentId!=="string"||!ID.test(deploymentId))throw new TypeError("Invalid deployment ID");
  if(!TARGETS.has(target))throw new TypeError("Unsupported deployment target");
  if(!["staging","production"].includes(environment))throw new TypeError("Unsupported deployment environment");
  const allowed=new Set([".html",".css",".js",".json",".svg",".png",".jpg",".jpeg",".webp",".ico",".txt"]);
  for(const file of manifest.files){
    const extension=file.path.includes(".")?"."+file.path.split(".").pop().toLowerCase():"";
    if(!allowed.has(extension))throw new TypeError("Unsupported deployment artifact");
  }
  return Object.freeze({version:DEPLOYMENT_PLAN_VERSION,id:deploymentId,project:manifest.project,target,environment,manifest,requiresApproval:true,requiresSecurityVerification:true,status:"planned"});
}

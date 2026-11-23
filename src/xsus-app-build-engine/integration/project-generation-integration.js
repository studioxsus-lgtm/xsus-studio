import {createProjectArchitecture} from "../architecture/project-architect.js";
import {generateStaticApp} from "../generator/code-generator.js";
import {validateBuildManifest} from "../build/build-manifest.js";
import {createXsusAppBuildBridge} from "./xsus-app-build-bridge.js";
export const PROJECT_GENERATION_INTEGRATION_VERSION="0.1.0";
/**
 * The planner is a trusted injected architecture producer, not a remote AI call.
 * Future and Hyper XSUS cores remain separate and are accessed only through adapters.
 */
export function createProjectGenerationIntegration({planner,authorize,runtime,recordResult}={}){
 if(typeof planner!=="function")throw new TypeError("Trusted architecture planner required");
 const generateProject=async({ownerId,projectId,prompt,signal})=>{
  if(signal?.aborted)throw new Error("Generation cancelled");
  const proposal=await planner({ownerId,projectId,prompt,signal});
  if(signal?.aborted)throw new Error("Generation cancelled");
  const architecture=createProjectArchitecture(proposal);
  const generated=generateStaticApp(architecture);
  return validateBuildManifest(generated);
 };
 return createXsusAppBuildBridge({authorize,generateProject,runtime,recordResult});
}
